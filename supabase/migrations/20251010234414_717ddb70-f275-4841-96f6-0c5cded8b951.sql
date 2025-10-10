-- Modificar user_daily_activity para que sea por período (no por día)
ALTER TABLE public.user_daily_activity DROP CONSTRAINT IF EXISTS user_daily_activity_user_id_activity_date_key;
ALTER TABLE public.user_daily_activity RENAME COLUMN activity_date TO period_start_date;
ALTER TABLE public.user_daily_activity ADD COLUMN IF NOT EXISTS period_end_date DATE;
ALTER TABLE public.user_daily_activity ADD CONSTRAINT user_daily_activity_period_unique UNIQUE(user_id, period_start_date);

-- Tabla de histórico de períodos completados
CREATE TABLE IF NOT EXISTS public.user_feedback_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  total_seconds INTEGER NOT NULL DEFAULT 0,
  goal_hours NUMERIC NOT NULL,
  goal_completed BOOLEAN NOT NULL DEFAULT false,
  creators_feedback_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_feedback_history_user ON public.user_feedback_history(user_id, period_start_date DESC);

ALTER TABLE public.user_feedback_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history"
ON public.user_feedback_history
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all history"
ON public.user_feedback_history
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Tabla para rastrear el impacto del feedback en los creadores
CREATE TABLE IF NOT EXISTS public.creator_feedback_impact (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  feedback_count INTEGER NOT NULL DEFAULT 0,
  diamantes_before BIGINT DEFAULT 0,
  diamantes_after BIGINT DEFAULT 0,
  views_before BIGINT DEFAULT 0,
  views_after BIGINT DEFAULT 0,
  engagement_before NUMERIC DEFAULT 0,
  engagement_after NUMERIC DEFAULT 0,
  dias_live_before INTEGER DEFAULT 0,
  dias_live_after INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(creator_id, period_start_date)
);

CREATE INDEX idx_creator_feedback_impact ON public.creator_feedback_impact(period_start_date DESC);

ALTER TABLE public.creator_feedback_impact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view impact"
ON public.creator_feedback_impact
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage impact"
ON public.creator_feedback_impact
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Función para calcular el inicio del período actual (día 15)
CREATE OR REPLACE FUNCTION get_current_period_start()
RETURNS DATE
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN EXTRACT(DAY FROM CURRENT_DATE) >= 15 
    THEN DATE_TRUNC('month', CURRENT_DATE)::DATE + INTERVAL '14 days'
    ELSE (DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1 month')::DATE + INTERVAL '14 days'
  END::DATE;
$$;

-- Función para calcular el fin del período actual
CREATE OR REPLACE FUNCTION get_current_period_end()
RETURNS DATE
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE 
    WHEN EXTRACT(DAY FROM CURRENT_DATE) >= 15 
    THEN (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month')::DATE + INTERVAL '13 days'
    ELSE DATE_TRUNC('month', CURRENT_DATE)::DATE + INTERVAL '13 days'
  END::DATE;
$$;