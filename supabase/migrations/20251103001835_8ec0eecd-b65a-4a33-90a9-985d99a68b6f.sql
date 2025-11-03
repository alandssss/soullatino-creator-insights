-- Extender logs_whatsapp para tracking de estados de Twilio
ALTER TABLE public.logs_whatsapp
ADD COLUMN IF NOT EXISTS status_updates jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ultimo_estado text,
ADD COLUMN IF NOT EXISTS ultima_actualizacion timestamptz,
ADD COLUMN IF NOT EXISTS delivery_status text,
ADD COLUMN IF NOT EXISTS read_at timestamptz,
ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
ADD COLUMN IF NOT EXISTS failed_at timestamptz,
ADD COLUMN IF NOT EXISTS error_code text;

CREATE INDEX IF NOT EXISTS idx_logs_whatsapp_message_sid 
ON public.logs_whatsapp(twilio_message_sid) 
WHERE twilio_message_sid IS NOT NULL;

COMMENT ON COLUMN public.logs_whatsapp.status_updates IS 
'Array de objetos JSON con historial de cambios de estado de Twilio';