-- Habilitar replicación completa para la tabla whatsapp_activity
ALTER TABLE public.whatsapp_activity REPLICA IDENTITY FULL;

-- Agregar la tabla a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_activity;