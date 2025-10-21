-- =====================================================
-- MÓDULO ALERTAS Y SUGERENCIAS - Complementos
-- Tabla de contactos y vista materializada de riesgos
-- =====================================================

-- Tabla de log de contactos (nueva)
CREATE TABLE IF NOT EXISTS public.creator_contact_log (
  id bigserial PRIMARY KEY,
  creator_id uuid NOT NULL,
  creator_username text,
  phone_e164 text,
  channel text CHECK (channel IN ('Telefono','WhatsApp')) NOT NULL,
  action text CHECK (action IN ('Click','MessageSent','Failed','CallInitiated')) NOT NULL,
  user_agent text,
  ip text,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_contact_log_creator
  ON public.creator_contact_log (creator_id, created_at DESC);

-- RLS para creator_contact_log
ALTER TABLE public.creator_contact_log ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'creator_contact_log' AND policyname = 'contact_log_read'
  ) THEN
    CREATE POLICY "contact_log_read"
      ON public.creator_contact_log
      FOR SELECT
      TO authenticated
      USING (
        has_role(auth.uid(), 'admin'::app_role) OR 
        has_role(auth.uid(), 'manager'::app_role)
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'creator_contact_log' AND policyname = 'contact_log_write'
  ) THEN
    CREATE POLICY "contact_log_write"
      ON public.creator_contact_log
      FOR INSERT
      TO authenticated
      WITH CHECK (
        has_role(auth.uid(), 'admin'::app_role) OR 
        has_role(auth.uid(), 'manager'::app_role)
      );
  END IF;
END $$;

-- Vista materializada de riesgos del mes (usando columnas existentes: fecha, horas, diamantes)
DROP MATERIALIZED VIEW IF EXISTS public.creator_riesgos_mes CASCADE;

CREATE MATERIALIZED VIEW public.creator_riesgos_mes AS
WITH mes_actual AS (
  SELECT
    date_trunc('month', timezone('America/Chihuahua', now()))::date as inicio_mes,
    (date_trunc('month', timezone('America/Chihuahua', now())) + interval '1 month - 1 day')::date as fin_mes,
    timezone('America/Chihuahua', now())::date as hoy
),
agregados_diarios AS (
  SELECT
    cld.creator_id,
    c.nombre as creator_username,
    c.telefono as phone_e164,
    COUNT(DISTINCT cld.fecha) FILTER (WHERE cld.horas > 0 OR cld.diamantes > 0) as dias_actuales,
    COALESCE(SUM(cld.horas), 0) as horas_actuales,
    COALESCE(SUM(cld.diamantes), 0) as diamantes_actuales
  FROM public.creator_live_daily cld
  JOIN public.creators c ON c.id = cld.creator_id
  CROSS JOIN mes_actual ma
  WHERE cld.fecha BETWEEN ma.inicio_mes AND ma.hoy
    AND c.status = 'activo'
  GROUP BY cld.creator_id, c.nombre, c.telefono
),
base AS (
  SELECT
    ad.*,
    ma.fin_mes,
    ma.hoy,
    GREATEST(0, ma.fin_mes - ma.hoy + 1) as dias_restantes,
    CASE
      WHEN ad.dias_actuales < 12 OR ad.horas_actuales < 40 THEN '12d/40h'
      WHEN ad.dias_actuales < 20 OR ad.horas_actuales < 60 THEN '20d/60h'
      WHEN ad.dias_actuales < 22 OR ad.horas_actuales < 80 THEN '22d/80h'
      ELSE '22d/80h'
    END as proximo_objetivo
  FROM agregados_diarios ad
  CROSS JOIN mes_actual ma
)
SELECT
  b.creator_id,
  b.creator_username,
  b.phone_e164,
  b.dias_actuales::int,
  b.horas_actuales,
  b.diamantes_actuales,
  b.proximo_objetivo,
  b.dias_restantes::int,
  CASE 
    WHEN b.proximo_objetivo = '12d/40h' THEN GREATEST(0, 12 - b.dias_actuales)
    WHEN b.proximo_objetivo = '20d/60h' THEN GREATEST(0, 20 - b.dias_actuales)
    WHEN b.proximo_objetivo = '22d/80h' THEN GREATEST(0, 22 - b.dias_actuales)
  END::int as faltan_dias,
  CASE 
    WHEN b.proximo_objetivo = '12d/40h' THEN GREATEST(0, 40 - b.horas_actuales)
    WHEN b.proximo_objetivo = '20d/60h' THEN GREATEST(0, 60 - b.horas_actuales)
    WHEN b.proximo_objetivo = '22d/80h' THEN GREATEST(0, 80 - b.horas_actuales)
  END as faltan_horas,
  CASE 
    WHEN (CASE 
      WHEN b.proximo_objetivo = '12d/40h' THEN GREATEST(0, 40 - b.horas_actuales)
      WHEN b.proximo_objetivo = '20d/60h' THEN GREATEST(0, 60 - b.horas_actuales)
      WHEN b.proximo_objetivo = '22d/80h' THEN GREATEST(0, 80 - b.horas_actuales)
    END) > 0 AND b.dias_restantes > 0
    THEN GREATEST(2.0, (CASE 
      WHEN b.proximo_objetivo = '12d/40h' THEN GREATEST(0, 40 - b.horas_actuales)
      WHEN b.proximo_objetivo = '20d/60h' THEN GREATEST(0, 60 - b.horas_actuales)
      WHEN b.proximo_objetivo = '22d/80h' THEN GREATEST(0, 80 - b.horas_actuales)
    END)::numeric / NULLIF(b.dias_restantes, 0))
    ELSE 0 
  END as horas_min_dia_sugeridas,
  (
    CASE 
      WHEN (CASE 
        WHEN b.proximo_objetivo = '12d/40h' THEN GREATEST(0, 12 - b.dias_actuales)
        WHEN b.proximo_objetivo = '20d/60h' THEN GREATEST(0, 20 - b.dias_actuales)
        WHEN b.proximo_objetivo = '22d/80h' THEN GREATEST(0, 22 - b.dias_actuales)
      END) > 0 THEN
        CASE 
          WHEN b.dias_restantes - (CASE 
            WHEN b.proximo_objetivo = '12d/40h' THEN GREATEST(0, 12 - b.dias_actuales)
            WHEN b.proximo_objetivo = '20d/60h' THEN GREATEST(0, 20 - b.dias_actuales)
            WHEN b.proximo_objetivo = '22d/80h' THEN GREATEST(0, 22 - b.dias_actuales)
          END) <= 0 THEN 50
          WHEN b.dias_restantes - (CASE 
            WHEN b.proximo_objetivo = '12d/40h' THEN GREATEST(0, 12 - b.dias_actuales)
            WHEN b.proximo_objetivo = '20d/60h' THEN GREATEST(0, 20 - b.dias_actuales)
            WHEN b.proximo_objetivo = '22d/80h' THEN GREATEST(0, 22 - b.dias_actuales)
          END) = 1 THEN 40
          WHEN b.dias_restantes - (CASE 
            WHEN b.proximo_objetivo = '12d/40h' THEN GREATEST(0, 12 - b.dias_actuales)
            WHEN b.proximo_objetivo = '20d/60h' THEN GREATEST(0, 20 - b.dias_actuales)
            WHEN b.proximo_objetivo = '22d/80h' THEN GREATEST(0, 22 - b.dias_actuales)
          END) <= 3 THEN 25
          ELSE 10 
        END
      ELSE 0 
    END +
    CASE 
      WHEN (CASE 
        WHEN b.proximo_objetivo = '12d/40h' THEN GREATEST(0, 40 - b.horas_actuales)
        WHEN b.proximo_objetivo = '20d/60h' THEN GREATEST(0, 60 - b.horas_actuales)
        WHEN b.proximo_objetivo = '22d/80h' THEN GREATEST(0, 80 - b.horas_actuales)
      END) > 20 THEN 30
      WHEN (CASE 
        WHEN b.proximo_objetivo = '12d/40h' THEN GREATEST(0, 40 - b.horas_actuales)
        WHEN b.proximo_objetivo = '20d/60h' THEN GREATEST(0, 60 - b.horas_actuales)
        WHEN b.proximo_objetivo = '22d/80h' THEN GREATEST(0, 80 - b.horas_actuales)
      END) > 10 THEN 20
      WHEN (CASE 
        WHEN b.proximo_objetivo = '12d/40h' THEN GREATEST(0, 40 - b.horas_actuales)
        WHEN b.proximo_objetivo = '20d/60h' THEN GREATEST(0, 60 - b.horas_actuales)
        WHEN b.proximo_objetivo = '22d/80h' THEN GREATEST(0, 80 - b.horas_actuales)
      END) > 0 THEN 10
      ELSE 0 
    END
  )::int as prioridad_riesgo
FROM base b;

-- Crear índices en la vista materializada
CREATE UNIQUE INDEX idx_creator_riesgos_mes_creator 
  ON public.creator_riesgos_mes (creator_id);

CREATE INDEX idx_creator_riesgos_mes_prioridad 
  ON public.creator_riesgos_mes (prioridad_riesgo DESC, faltan_dias DESC, faltan_horas DESC);

-- Función para refrescar la vista
CREATE OR REPLACE FUNCTION public.refresh_creator_riesgos_mes()
RETURNS void 
LANGUAGE sql 
SECURITY DEFINER
SET search_path = public
AS $$ 
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.creator_riesgos_mes;
$$;

-- Permisos para la vista materializada
GRANT SELECT ON public.creator_riesgos_mes TO authenticated;