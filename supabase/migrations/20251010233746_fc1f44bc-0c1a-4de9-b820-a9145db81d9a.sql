-- Tabla para rastrear actividad diaria de usuarios
CREATE TABLE IF NOT EXISTS public.user_daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  accumulated_seconds INTEGER NOT NULL DEFAULT 0,
  daily_goal_hours NUMERIC NOT NULL DEFAULT 8,
  is_active BOOLEAN NOT NULL DEFAULT false,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, activity_date)
);

-- Índice para búsquedas rápidas
CREATE INDEX idx_user_daily_activity_user_date ON public.user_daily_activity(user_id, activity_date);

-- Enable RLS
ALTER TABLE public.user_daily_activity ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios vean su propia actividad
CREATE POLICY "Users can view own activity"
ON public.user_daily_activity
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Política para que los usuarios inserten su propia actividad
CREATE POLICY "Users can insert own activity"
ON public.user_daily_activity
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política para que los usuarios actualicen su propia actividad
CREATE POLICY "Users can update own activity"
ON public.user_daily_activity
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admins pueden ver toda la actividad
CREATE POLICY "Admins can view all activity"
ON public.user_daily_activity
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_user_daily_activity_updated_at
BEFORE UPDATE ON public.user_daily_activity
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabla de configuración de metas por usuario
CREATE TABLE IF NOT EXISTS public.user_work_goals (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_hours_goal NUMERIC NOT NULL DEFAULT 8,
  user_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_work_goals ENABLE ROW LEVEL SECURITY;

-- Políticas para user_work_goals
CREATE POLICY "Users can view own goals"
ON public.user_work_goals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all goals"
ON public.user_work_goals
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));