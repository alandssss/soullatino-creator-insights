-- Revertir cambios de período y volver a tracking diario
ALTER TABLE public.user_daily_activity DROP CONSTRAINT IF EXISTS user_daily_activity_period_unique;
ALTER TABLE public.user_daily_activity RENAME COLUMN period_start_date TO activity_date;
ALTER TABLE public.user_daily_activity DROP COLUMN IF EXISTS period_end_date;
ALTER TABLE public.user_daily_activity ADD CONSTRAINT user_daily_activity_unique UNIQUE(user_id, activity_date);

-- Modificar histórico para ser mensual en lugar de por período
DROP TABLE IF EXISTS public.user_feedback_history CASCADE;

-- Eliminar funciones de período que ya no se usan
DROP FUNCTION IF EXISTS get_current_period_start();
DROP FUNCTION IF EXISTS get_current_period_end();

-- Modificar tabla de impacto para ser mensual
ALTER TABLE public.creator_feedback_impact DROP CONSTRAINT IF EXISTS creator_feedback_impact_creator_id_period_start_date_key;
ALTER TABLE public.creator_feedback_impact RENAME COLUMN period_start_date TO month_date;
ALTER TABLE public.creator_feedback_impact DROP COLUMN IF EXISTS period_end_date;
ALTER TABLE public.creator_feedback_impact ADD CONSTRAINT creator_feedback_impact_monthly UNIQUE(creator_id, month_date);