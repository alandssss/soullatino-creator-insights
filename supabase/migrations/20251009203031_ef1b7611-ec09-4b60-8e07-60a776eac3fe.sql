-- Mejorar las políticas RLS de whatsapp_activity para tiempo real

-- Eliminar política existente
DROP POLICY IF EXISTS "Admins can view all activity" ON public.whatsapp_activity;

-- Crear nueva política SELECT para admins usando la función has_role
CREATE POLICY "Admins can view all activity" 
ON public.whatsapp_activity
FOR SELECT 
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
);

-- Asegurar que la política INSERT también use la función correcta
DROP POLICY IF EXISTS "Authenticated users can insert activity" ON public.whatsapp_activity;

CREATE POLICY "Authenticated users can insert activity" 
ON public.whatsapp_activity
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);