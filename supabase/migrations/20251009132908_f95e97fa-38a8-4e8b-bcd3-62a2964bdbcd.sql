-- Agregar campo de nombre de usuario de TikTok si no existe
ALTER TABLE public.creators 
ADD COLUMN IF NOT EXISTS tiktok_username text;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_creators_tiktok_username ON public.creators(tiktok_username);