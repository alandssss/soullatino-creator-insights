-- Fix get_user_role() function to have explicit search_path for security
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
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