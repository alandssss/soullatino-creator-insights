-- Crear tabla de métricas diarias si no existe
CREATE TABLE IF NOT EXISTS public.creator_live_daily (
  id bigserial PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  horas numeric(6,2) NOT NULL DEFAULT 0,
  diamantes numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (creator_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_creator_live_daily_fecha ON public.creator_live_daily(creator_id, fecha DESC);

-- Actualizar tabla creator_bonificaciones con nuevos campos de predicción
ALTER TABLE public.creator_bonificaciones
  ADD COLUMN IF NOT EXISTS req_diam_por_dia_50k numeric(10,2),
  ADD COLUMN IF NOT EXISTS req_diam_por_dia_100k numeric(10,2),
  ADD COLUMN IF NOT EXISTS req_diam_por_dia_300k numeric(10,2),
  ADD COLUMN IF NOT EXISTS req_diam_por_dia_500k numeric(10,2),
  ADD COLUMN IF NOT EXISTS req_diam_por_dia_1m numeric(10,2),
  ADD COLUMN IF NOT EXISTS faltan_50k numeric(12,2),
  ADD COLUMN IF NOT EXISTS faltan_100k numeric(12,2),
  ADD COLUMN IF NOT EXISTS faltan_300k numeric(12,2),
  ADD COLUMN IF NOT EXISTS faltan_500k numeric(12,2),
  ADD COLUMN IF NOT EXISTS faltan_1m numeric(12,2),
  ADD COLUMN IF NOT EXISTS prob_50k numeric(5,2),
  ADD COLUMN IF NOT EXISTS prob_100k numeric(5,2),
  ADD COLUMN IF NOT EXISTS prob_300k numeric(5,2),
  ADD COLUMN IF NOT EXISTS prob_500k numeric(5,2),
  ADD COLUMN IF NOT EXISTS prob_1m numeric(5,2),
  ADD COLUMN IF NOT EXISTS hito_12_40 boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hito_20_60 boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS hito_22_80 boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS meta_recomendada text,
  ADD COLUMN IF NOT EXISTS texto_creador text,
  ADD COLUMN IF NOT EXISTS texto_manager text,
  ADD COLUMN IF NOT EXISTS es_nuevo_menos_90_dias boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bono_dias_extra_usd numeric(8,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_estimada_50k date,
  ADD COLUMN IF NOT EXISTS fecha_estimada_100k date,
  ADD COLUMN IF NOT EXISTS fecha_estimada_300k date,
  ADD COLUMN IF NOT EXISTS fecha_estimada_500k date,
  ADD COLUMN IF NOT EXISTS fecha_estimada_1m date,
  ADD COLUMN IF NOT EXISTS semaforo_50k text,
  ADD COLUMN IF NOT EXISTS semaforo_100k text,
  ADD COLUMN IF NOT EXISTS semaforo_300k text,
  ADD COLUMN IF NOT EXISTS semaforo_500k text,
  ADD COLUMN IF NOT EXISTS semaforo_1m text;

-- Función de cálculo mensual con predicción
CREATE OR REPLACE FUNCTION public.calcular_bonificaciones_mes(mes_referencia date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mes_inicio date := date_trunc('month', mes_referencia)::date;
  mes_fin date := (mes_inicio + interval '1 month - 1 day')::date;
  hoy date := current_date;
  corte date := LEAST(hoy - 1, mes_fin);
  dias_restantes int := GREATEST((mes_fin - corte), 0);
  dias_transcurridos int := (corte - mes_inicio) + 1;
BEGIN
  INSERT INTO public.creator_bonificaciones AS cb (
    creator_id, mes_referencia,
    dias_live_mes, horas_live_mes, diam_live_mes,
    faltan_50k, faltan_100k, faltan_300k, faltan_500k, faltan_1m,
    req_diam_por_dia_50k, req_diam_por_dia_100k, req_diam_por_dia_300k, 
    req_diam_por_dia_500k, req_diam_por_dia_1m,
    prob_50k, prob_100k, prob_300k, prob_500k, prob_1m,
    hito_12_40, hito_20_60, hito_22_80,
    meta_recomendada, texto_creador, texto_manager,
    es_nuevo_menos_90_dias, bono_dias_extra_usd,
    fecha_estimada_50k, fecha_estimada_100k, fecha_estimada_300k,
    fecha_estimada_500k, fecha_estimada_1m,
    semaforo_50k, semaforo_100k, semaforo_300k, semaforo_500k, semaforo_1m,
    updated_at
  )
  SELECT
    d.creator_id,
    mes_inicio,
    COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0))::int AS dias_live_mes,
    COALESCE(SUM(horas),0) AS horas_live_mes,
    COALESCE(SUM(diamantes),0) AS diam_live_mes,
    GREATEST(50000 - COALESCE(SUM(diamantes),0), 0) AS faltan_50k,
    GREATEST(100000 - COALESCE(SUM(diamantes),0), 0) AS faltan_100k,
    GREATEST(300000 - COALESCE(SUM(diamantes),0), 0) AS faltan_300k,
    GREATEST(500000 - COALESCE(SUM(diamantes),0), 0) AS faltan_500k,
    GREATEST(1000000 - COALESCE(SUM(diamantes),0), 0) AS faltan_1m,
    CASE WHEN dias_restantes > 0 THEN ROUND(GREATEST(50000 - COALESCE(SUM(diamantes),0), 0) / dias_restantes, 2) END AS req_50k,
    CASE WHEN dias_restantes > 0 THEN ROUND(GREATEST(100000 - COALESCE(SUM(diamantes),0), 0) / dias_restantes, 2) END AS req_100k,
    CASE WHEN dias_restantes > 0 THEN ROUND(GREATEST(300000 - COALESCE(SUM(diamantes),0), 0) / dias_restantes, 2) END AS req_300k,
    CASE WHEN dias_restantes > 0 THEN ROUND(GREATEST(500000 - COALESCE(SUM(diamantes),0), 0) / dias_restantes, 2) END AS req_500k,
    CASE WHEN dias_restantes > 0 THEN ROUND(GREATEST(1000000 - COALESCE(SUM(diamantes),0), 0) / dias_restantes, 2) END AS req_1m,
    -- Probabilidades basadas en ritmo
    CASE
      WHEN GREATEST(50000 - COALESCE(SUM(diamantes),0), 0) = 0 THEN 100
      WHEN dias_restantes = 0 THEN 0
      ELSE LEAST(100, ROUND(
        (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)) /
        NULLIF(GREATEST(50000 - COALESCE(SUM(diamantes),0),0) / NULLIF(dias_restantes,0), 0) * 90, 0
      ))
    END AS prob_50k,
    CASE
      WHEN GREATEST(100000 - COALESCE(SUM(diamantes),0), 0) = 0 THEN 100
      WHEN dias_restantes = 0 THEN 0
      ELSE LEAST(100, ROUND(
        (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)) /
        NULLIF(GREATEST(100000 - COALESCE(SUM(diamantes),0),0) / NULLIF(dias_restantes,0), 0) * 90, 0
      ))
    END AS prob_100k,
    CASE
      WHEN GREATEST(300000 - COALESCE(SUM(diamantes),0), 0) = 0 THEN 100
      WHEN dias_restantes = 0 THEN 0
      ELSE LEAST(100, ROUND(
        (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)) /
        NULLIF(GREATEST(300000 - COALESCE(SUM(diamantes),0),0) / NULLIF(dias_restantes,0), 0) * 90, 0
      ))
    END AS prob_300k,
    CASE
      WHEN GREATEST(500000 - COALESCE(SUM(diamantes),0), 0) = 0 THEN 100
      WHEN dias_restantes = 0 THEN 0
      ELSE LEAST(100, ROUND(
        (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)) /
        NULLIF(GREATEST(500000 - COALESCE(SUM(diamantes),0),0) / NULLIF(dias_restantes,0), 0) * 90, 0
      ))
    END AS prob_500k,
    CASE
      WHEN GREATEST(1000000 - COALESCE(SUM(diamantes),0), 0) = 0 THEN 100
      WHEN dias_restantes = 0 THEN 0
      ELSE LEAST(100, ROUND(
        (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)) /
        NULLIF(GREATEST(1000000 - COALESCE(SUM(diamantes),0),0) / NULLIF(dias_restantes,0), 0) * 90, 0
      ))
    END AS prob_1m,
    (COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)) >= 12 AND COALESCE(SUM(horas),0) >= 40) AS hito_12_40,
    (COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)) >= 20 AND COALESCE(SUM(horas),0) >= 60) AS hito_20_60,
    (COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)) >= 22 AND COALESCE(SUM(horas),0) >= 80) AS hito_22_80,
    CASE
      WHEN GREATEST(300000 - COALESCE(SUM(diamantes),0),0) = 0 THEN '500K'
      WHEN GREATEST(100000 - COALESCE(SUM(diamantes),0),0) = 0 THEN '300K'
      WHEN GREATEST(50000 - COALESCE(SUM(diamantes),0),0) = 0 THEN '100K'
      ELSE '50K'
    END AS meta_recomendada,
    CONCAT(
      '🎯 Ritmo: ', ROUND(COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0), 0),
      ' 💎/día | Quedan ', dias_restantes, ' días'
    ) AS texto_creador,
    CONCAT(
      'Meta priorizada: ',
      CASE
        WHEN GREATEST(300000 - COALESCE(SUM(diamantes),0),0) = 0 THEN '500K'
        WHEN GREATEST(100000 - COALESCE(SUM(diamantes),0),0) = 0 THEN '300K'
        WHEN GREATEST(50000 - COALESCE(SUM(diamantes),0),0) = 0 THEN '100K'
        ELSE '50K'
      END
    ) AS texto_manager,
    (SELECT c.dias_en_agencia < 90 FROM creators c WHERE c.id = d.creator_id) AS es_nuevo,
    GREATEST((COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)) - 22),0) * 3 AS bono_extra,
    CASE WHEN COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0) > 0
      THEN corte + CEIL(GREATEST(50000 - COALESCE(SUM(diamantes),0), 0) / 
           (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)))::int
    END AS fecha_est_50k,
    CASE WHEN COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0) > 0
      THEN corte + CEIL(GREATEST(100000 - COALESCE(SUM(diamantes),0), 0) / 
           (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)))::int
    END AS fecha_est_100k,
    CASE WHEN COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0) > 0
      THEN corte + CEIL(GREATEST(300000 - COALESCE(SUM(diamantes),0), 0) / 
           (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)))::int
    END AS fecha_est_300k,
    CASE WHEN COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0) > 0
      THEN corte + CEIL(GREATEST(500000 - COALESCE(SUM(diamantes),0), 0) / 
           (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)))::int
    END AS fecha_est_500k,
    CASE WHEN COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0) > 0
      THEN corte + CEIL(GREATEST(1000000 - COALESCE(SUM(diamantes),0), 0) / 
           (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)))::int
    END AS fecha_est_1m,
    CASE WHEN GREATEST(50000 - COALESCE(SUM(diamantes),0), 0) = 0 THEN 'verde'
         WHEN (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)) >= 
              (GREATEST(50000 - COALESCE(SUM(diamantes),0),0) / NULLIF(dias_restantes,0)) THEN 'verde'
         WHEN (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)) >= 
              0.7 * (GREATEST(50000 - COALESCE(SUM(diamantes),0),0) / NULLIF(dias_restantes,0)) THEN 'amarillo'
         ELSE 'rojo'
    END AS sem_50k,
    CASE WHEN GREATEST(100000 - COALESCE(SUM(diamantes),0), 0) = 0 THEN 'verde'
         WHEN (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)) >= 
              (GREATEST(100000 - COALESCE(SUM(diamantes),0),0) / NULLIF(dias_restantes,0)) THEN 'verde'
         WHEN (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)) >= 
              0.7 * (GREATEST(100000 - COALESCE(SUM(diamantes),0),0) / NULLIF(dias_restantes,0)) THEN 'amarillo'
         ELSE 'rojo'
    END AS sem_100k,
    CASE WHEN GREATEST(300000 - COALESCE(SUM(diamantes),0), 0) = 0 THEN 'verde'
         WHEN (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)) >= 
              (GREATEST(300000 - COALESCE(SUM(diamantes),0),0) / NULLIF(dias_restantes,0)) THEN 'verde'
         WHEN (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)) >= 
              0.7 * (GREATEST(300000 - COALESCE(SUM(diamantes),0),0) / NULLIF(dias_restantes,0)) THEN 'amarillo'
         ELSE 'rojo'
    END AS sem_300k,
    CASE WHEN GREATEST(500000 - COALESCE(SUM(diamantes),0), 0) = 0 THEN 'verde'
         WHEN (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)) >= 
              (GREATEST(500000 - COALESCE(SUM(diamantes),0),0) / NULLIF(dias_restantes,0)) THEN 'verde'
         WHEN (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)) >= 
              0.7 * (GREATEST(500000 - COALESCE(SUM(diamantes),0),0) / NULLIF(dias_restantes,0)) THEN 'amarillo'
         ELSE 'rojo'
    END AS sem_500k,
    CASE WHEN GREATEST(1000000 - COALESCE(SUM(diamantes),0), 0) = 0 THEN 'verde'
         WHEN (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)) >= 
              (GREATEST(1000000 - COALESCE(SUM(diamantes),0),0) / NULLIF(dias_restantes,0)) THEN 'verde'
         WHEN (COALESCE(SUM(diamantes),0) / NULLIF(COUNT(*) FILTER (WHERE (horas > 0 OR diamantes > 0)),0)) >= 
              0.7 * (GREATEST(1000000 - COALESCE(SUM(diamantes),0),0) / NULLIF(dias_restantes,0)) THEN 'amarillo'
         ELSE 'rojo'
    END AS sem_1m,
    now()
  FROM public.creator_live_daily d
  WHERE d.fecha BETWEEN mes_inicio AND corte
  GROUP BY d.creator_id
  ON CONFLICT (creator_id, mes_referencia) DO UPDATE
  SET
    dias_live_mes = EXCLUDED.dias_live_mes,
    horas_live_mes = EXCLUDED.horas_live_mes,
    diam_live_mes = EXCLUDED.diam_live_mes,
    faltan_50k = EXCLUDED.faltan_50k,
    faltan_100k = EXCLUDED.faltan_100k,
    faltan_300k = EXCLUDED.faltan_300k,
    faltan_500k = EXCLUDED.faltan_500k,
    faltan_1m = EXCLUDED.faltan_1m,
    req_diam_por_dia_50k = EXCLUDED.req_diam_por_dia_50k,
    req_diam_por_dia_100k = EXCLUDED.req_diam_por_dia_100k,
    req_diam_por_dia_300k = EXCLUDED.req_diam_por_dia_300k,
    req_diam_por_dia_500k = EXCLUDED.req_diam_por_dia_500k,
    req_diam_por_dia_1m = EXCLUDED.req_diam_por_dia_1m,
    prob_50k = EXCLUDED.prob_50k,
    prob_100k = EXCLUDED.prob_100k,
    prob_300k = EXCLUDED.prob_300k,
    prob_500k = EXCLUDED.prob_500k,
    prob_1m = EXCLUDED.prob_1m,
    hito_12_40 = EXCLUDED.hito_12_40,
    hito_20_60 = EXCLUDED.hito_20_60,
    hito_22_80 = EXCLUDED.hito_22_80,
    meta_recomendada = EXCLUDED.meta_recomendada,
    texto_creador = EXCLUDED.texto_creador,
    texto_manager = EXCLUDED.texto_manager,
    es_nuevo_menos_90_dias = EXCLUDED.es_nuevo_menos_90_dias,
    bono_dias_extra_usd = EXCLUDED.bono_dias_extra_usd,
    fecha_estimada_50k = EXCLUDED.fecha_estimada_50k,
    fecha_estimada_100k = EXCLUDED.fecha_estimada_100k,
    fecha_estimada_300k = EXCLUDED.fecha_estimada_300k,
    fecha_estimada_500k = EXCLUDED.fecha_estimada_500k,
    fecha_estimada_1m = EXCLUDED.fecha_estimada_1m,
    semaforo_50k = EXCLUDED.semaforo_50k,
    semaforo_100k = EXCLUDED.semaforo_100k,
    semaforo_300k = EXCLUDED.semaforo_300k,
    semaforo_500k = EXCLUDED.semaforo_500k,
    semaforo_1m = EXCLUDED.semaforo_1m,
    updated_at = now();
END;
$$;

-- RLS para creator_live_daily
ALTER TABLE public.creator_live_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_data_read" ON public.creator_live_daily
  FOR SELECT TO public
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR has_role((SELECT auth.uid()), 'manager'::app_role)
    OR has_role((SELECT auth.uid()), 'viewer'::app_role)
  );

CREATE POLICY "daily_data_write" ON public.creator_live_daily
  FOR INSERT TO public
  WITH CHECK (
    has_role((SELECT auth.uid()), 'admin'::app_role)
    OR has_role((SELECT auth.uid()), 'manager'::app_role)
  );

GRANT EXECUTE ON FUNCTION public.calcular_bonificaciones_mes(date) TO authenticated;