-- Crear tabla para trackear actividad de WhatsApp en tiempo real
CREATE TABLE IF NOT EXISTS public.whatsapp_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  creator_name TEXT,
  message_preview TEXT
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_activity ENABLE ROW LEVEL SECURITY;

-- Policy para que admins puedan ver toda la actividad
CREATE POLICY "Admins can view all activity"
ON public.whatsapp_activity
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'::app_role
  )
);

-- Policy para que usuarios autenticados puedan insertar su propia actividad
CREATE POLICY "Authenticated users can insert activity"
ON public.whatsapp_activity
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Habilitar realtime para la tabla
ALTER TABLE public.whatsapp_activity REPLICA IDENTITY FULL;

-- Crear índice para mejorar performance
CREATE INDEX idx_whatsapp_activity_timestamp ON public.whatsapp_activity(timestamp DESC);
CREATE INDEX idx_whatsapp_activity_creator ON public.whatsapp_activity(creator_id);