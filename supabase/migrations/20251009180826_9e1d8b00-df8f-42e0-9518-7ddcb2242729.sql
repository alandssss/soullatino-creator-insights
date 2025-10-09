-- Agregar constraint UNIQUE a tiktok_username para permitir upserts
-- Primero eliminar duplicados si existen
DELETE FROM creators a USING creators b
WHERE a.id > b.id 
AND a.tiktok_username = b.tiktok_username
AND a.tiktok_username IS NOT NULL;

-- Agregar la constraint UNIQUE
ALTER TABLE creators 
ADD CONSTRAINT creators_tiktok_username_key UNIQUE (tiktok_username);