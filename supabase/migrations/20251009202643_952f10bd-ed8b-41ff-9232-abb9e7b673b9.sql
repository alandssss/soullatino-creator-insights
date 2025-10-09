-- Agregar campo hito_diamantes a la tabla creators
ALTER TABLE public.creators 
ADD COLUMN hito_diamantes bigint DEFAULT 50000;

COMMENT ON COLUMN public.creators.hito_diamantes IS 'Meta mensual de diamantes asignada al creador según su nivel (ej: 50K rookie, 100K intermedio, 300K avanzado, 500K elite, 1M+ pro)';