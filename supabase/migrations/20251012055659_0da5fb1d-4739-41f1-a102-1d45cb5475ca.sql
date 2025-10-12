-- Parte 2: Tabla principal de supervisión live
CREATE TABLE IF NOT EXISTS public.supervision_live_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  observer_user_id uuid NOT NULL,
  observer_name text,
  fecha_evento timestamptz NOT NULL DEFAULT now(),

  -- Flags de registro rápido
  en_vivo boolean DEFAULT false,
  en_batalla boolean DEFAULT false,
  buena_iluminacion boolean DEFAULT false,
  cumple_normas boolean DEFAULT true,
  audio_claro boolean DEFAULT false,
  set_profesional boolean DEFAULT false,

  -- Reporte/incidente
  reporte text,
  severidad text CHECK (severidad IN ('baja', 'media', 'alta')),
  accion_sugerida text,

  -- Scoring y semáforo (calculado automáticamente)
  score int DEFAULT 0,
  riesgo text CHECK (riesgo IN ('verde', 'amarillo', 'rojo')),

  -- Adjuntos opcionales
  attachments jsonb DEFAULT '[]'::jsonb
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sup_live_creator_fecha
  ON public.supervision_live_logs(creator_id, fecha_evento DESC);
CREATE INDEX IF NOT EXISTS idx_sup_live_riesgo
  ON public.supervision_live_logs(riesgo);
CREATE INDEX IF NOT EXISTS idx_sup_live_observer
  ON public.supervision_live_logs(observer_user_id);

-- Funciones para calcular score y semáforo
CREATE OR REPLACE FUNCTION public.supervision_compute_score(
  _en_vivo boolean,
  _en_batalla boolean,
  _buena_iluminacion boolean,
  _cumple_normas boolean,
  _audio_claro boolean,
  _set_profesional boolean,
  _severidad text
) RETURNS int
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  s int := 0;
BEGIN
  IF _en_vivo THEN s := s + 1; END IF;
  IF _en_batalla THEN s := s + 2; END IF;
  IF _buena_iluminacion THEN s := s + 1; END IF;
  IF _audio_claro THEN s := s + 1; END IF;
  IF _set_profesional THEN s := s + 1; END IF;
  IF _cumple_normas = false THEN s := s - 4; END IF;

  IF _severidad = 'media' THEN s := s - 3; END IF;
  IF _severidad = 'alta' THEN s := s - 7; END IF;

  RETURN s;
END;
$$;

CREATE OR REPLACE FUNCTION public.supervision_score_to_risk(_score int)
RETURNS text
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF _score >= 2 THEN RETURN 'verde'; END IF;
  IF _score >= -1 THEN RETURN 'amarillo'; END IF;
  RETURN 'rojo';
END;
$$;

-- Trigger para calcular score/riesgo automáticamente
CREATE OR REPLACE FUNCTION public.supervision_live_logs_aiu()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s int;
BEGIN
  s := public.supervision_compute_score(
    NEW.en_vivo,
    NEW.en_batalla,
    NEW.buena_iluminacion,
    NEW.cumple_normas,
    NEW.audio_claro,
    NEW.set_profesional,
    NEW.severidad
  );
  NEW.score := s;
  NEW.riesgo := public.supervision_score_to_risk(s);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sup_live_aiu ON public.supervision_live_logs;
CREATE TRIGGER trg_sup_live_aiu
  BEFORE INSERT OR UPDATE ON public.supervision_live_logs
  FOR EACH ROW EXECUTE FUNCTION public.supervision_live_logs_aiu();

-- Trigger para updated_at
DROP TRIGGER IF EXISTS trg_sup_live_updated_at ON public.supervision_live_logs;
CREATE TRIGGER trg_sup_live_updated_at
  BEFORE UPDATE ON public.supervision_live_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vista agregada por mes/creador
CREATE OR REPLACE VIEW public.supervision_live_summary AS
SELECT
  l.creator_id,
  date_trunc('month', l.fecha_evento)::date AS mes,
  COUNT(*) AS eventos,
  SUM((l.en_vivo)::int) AS cnt_en_vivo,
  SUM((l.en_batalla)::int) AS cnt_en_batalla,
  SUM((l.buena_iluminacion)::int) AS cnt_buena_iluminacion,
  SUM((l.cumple_normas)::int) AS cnt_cumple_normas,
  SUM((l.audio_claro)::int) AS cnt_audio_claro,
  SUM((l.set_profesional)::int) AS cnt_set_prof,
  AVG(l.score)::numeric(5,2) AS score_promedio,
  COUNT(*) FILTER (WHERE l.riesgo = 'rojo') AS cnt_riesgo_alto,
  COUNT(*) FILTER (WHERE l.riesgo = 'amarillo') AS cnt_riesgo_medio,
  COUNT(*) FILTER (WHERE l.riesgo = 'verde') AS cnt_riesgo_bajo
FROM public.supervision_live_logs l
GROUP BY l.creator_id, date_trunc('month', l.fecha_evento);

-- RLS
ALTER TABLE public.supervision_live_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supervision_read"
  ON public.supervision_live_logs FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'supervisor'::app_role)
  );

CREATE POLICY "supervision_write"
  ON public.supervision_live_logs FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'supervisor'::app_role)
  );

CREATE POLICY "supervision_update"
  ON public.supervision_live_logs FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'supervisor'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'manager'::app_role) OR
    has_role(auth.uid(), 'supervisor'::app_role)
  );

CREATE POLICY "supervision_delete_admin_only"
  ON public.supervision_live_logs FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Permisos
GRANT SELECT ON public.supervision_live_summary TO authenticated;
GRANT ALL ON public.supervision_live_logs TO authenticated;