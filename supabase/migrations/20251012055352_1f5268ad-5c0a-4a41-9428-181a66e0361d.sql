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

GRANT EXECUTE ON FUNCTION public.calcular_bonificaciones_mes(date) TO authenticated;