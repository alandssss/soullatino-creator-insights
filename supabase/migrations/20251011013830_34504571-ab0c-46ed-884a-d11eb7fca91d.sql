-- Eliminar la restricción CHECK que está bloqueando las inserciones
ALTER TABLE creator_interactions DROP CONSTRAINT IF EXISTS creator_interactions_tipo_interaccion_check;

-- Habilitar realtime para creator_interactions
ALTER TABLE creator_interactions REPLICA IDENTITY FULL;

-- Agregar creator_interactions a realtime (las otras ya están)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE creator_interactions;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- La tabla ya está en la publicación, ignorar error
END $$;

-- Habilitar user_daily_activity para realtime también
ALTER TABLE user_daily_activity REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE user_daily_activity;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;