-- Corregir funciones restantes sin search_path

-- Función: has_role (actualizar para incluir pg_catalog)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Función: get_user_role con user_id (actualizar para incluir pg_catalog)
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT ur.role::text
  FROM public.user_roles AS ur
  WHERE ur.user_id = p_user_id
  ORDER BY ur.created_at DESC
  LIMIT 1;
$$;

-- Función: get_user_role sin parámetros (actualizar para incluir pg_catalog)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
  SELECT ur.role::text
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  ORDER BY CASE ur.role 
    WHEN 'admin' THEN 1 
    WHEN 'manager' THEN 2 
    WHEN 'reclutador' THEN 3
    WHEN 'viewer' THEN 4
    ELSE 5 
  END
  LIMIT 1;
$$;

-- Revocar acceso público a la vista materializada creator_tiers si existe
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' AND matviewname = 'creator_tiers'
  ) THEN
    REVOKE ALL ON public.creator_tiers FROM anon, authenticated;
    GRANT SELECT ON public.creator_tiers TO authenticated;
  END IF;
END $$;