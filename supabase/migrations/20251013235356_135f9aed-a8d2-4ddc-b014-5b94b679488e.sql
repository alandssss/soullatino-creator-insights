-- Crear tabla para metas de creadores
CREATE TABLE IF NOT EXISTS public.creator_metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  metrica_tipo TEXT NOT NULL, -- 'diamantes_30d', 'views_30d', 'engagement_rate', etc.
  valor_objetivo NUMERIC NOT NULL,
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_finalizacion DATE NOT NULL,
  descripcion TEXT,
  notas TEXT,
  completada BOOLEAN DEFAULT false,
  fecha_completada TIMESTAMP WITH TIME ZONE,
  progreso_actual NUMERIC DEFAULT 0,
  created_by_user_id UUID,
  created_by_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_creator_metas_creator_id ON public.creator_metas(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_metas_fecha_fin ON public.creator_metas(fecha_finalizacion);
CREATE INDEX IF NOT EXISTS idx_creator_metas_completada ON public.creator_metas(completada);

-- Trigger para updated_at
CREATE TRIGGER update_creator_metas_updated_at
  BEFORE UPDATE ON public.creator_metas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.creator_metas ENABLE ROW LEVEL SECURITY;

-- Admins y managers pueden ver todas las metas
CREATE POLICY "metas_read"
  ON public.creator_metas
  FOR SELECT
  TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'viewer'::app_role)
  );

-- Admins y managers pueden crear metas
CREATE POLICY "metas_write"
  ON public.creator_metas
  FOR INSERT
  TO public
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

-- Admins y managers pueden actualizar metas
CREATE POLICY "metas_update"
  ON public.creator_metas
  FOR UPDATE
  TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );

-- Admins y managers pueden eliminar metas
CREATE POLICY "metas_delete"
  ON public.creator_metas
  FOR DELETE
  TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role)
  );