-- Parte 1: Solo agregar el valor al enum (debe ser una migración separada)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'supervisor' 
      AND enumtypid = 'app_role'::regtype
  ) THEN
    ALTER TYPE app_role ADD VALUE 'supervisor';
  END IF;
END$$;