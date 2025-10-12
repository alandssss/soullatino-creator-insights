-- Crear tabla de prospectos de reclutamiento
CREATE TABLE IF NOT EXISTS public.prospectos_reclutamiento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Datos básicos del prospecto
  nombre_completo text NOT NULL,
  usuario_tiktok text NOT NULL,
  pais text NOT NULL,
  whatsapp text NOT NULL,
  instagram text,
  edad integer,
  lengua text DEFAULT 'Español',
  fuente_reclutamiento text,
  
  -- Información de seguimiento
  reclutador_id uuid,
  reclutador_nombre text,
  fecha_captura timestamp with time zone DEFAULT now(),
  estado_actual text NOT NULL DEFAULT 'nuevo',
  fecha_ultimo_cambio timestamp with time zone DEFAULT now(),
  
  -- Estados de progreso
  mostro_interes boolean,
  agendo_prueba boolean,
  fecha_aceptacion timestamp with time zone,
  
  -- Registro en Humand
  en_humand boolean DEFAULT false,
  fecha_ingreso_humand timestamp with time zone,
  usuario_humand text,
  validado_por text,
  
  -- Notas y seguimiento
  notas jsonb DEFAULT '[]'::jsonb,
  
  CONSTRAINT valid_estado CHECK (estado_actual IN ('nuevo', 'contactado', 'acepto', 'registrado_humand', 'activo', 'descartado'))
);

-- Habilitar RLS
ALTER TABLE public.prospectos_reclutamiento ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins y reclutadores pueden ver prospectos"
ON public.prospectos_reclutamiento
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'reclutador'::app_role)
);

CREATE POLICY "Admins y reclutadores pueden crear prospectos"
ON public.prospectos_reclutamiento
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'reclutador'::app_role)
);

CREATE POLICY "Admins y reclutadores pueden actualizar prospectos"
ON public.prospectos_reclutamiento
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'reclutador'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'reclutador'::app_role)
);

CREATE POLICY "Solo admins pueden eliminar prospectos"
ON public.prospectos_reclutamiento
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Tabla para registro de actividad de reclutamiento
CREATE TABLE IF NOT EXISTS public.actividad_reclutamiento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospecto_id uuid REFERENCES public.prospectos_reclutamiento(id) ON DELETE CASCADE,
  user_id uuid,
  user_email text,
  accion text NOT NULL,
  estado_anterior text,
  estado_nuevo text,
  nota text,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS para actividad
ALTER TABLE public.actividad_reclutamiento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins y reclutadores pueden ver actividad"
ON public.actividad_reclutamiento
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'reclutador'::app_role)
);

CREATE POLICY "Admins y reclutadores pueden crear actividad"
ON public.actividad_reclutamiento
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'reclutador'::app_role)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_prospectos_estado ON public.prospectos_reclutamiento(estado_actual);
CREATE INDEX IF NOT EXISTS idx_prospectos_reclutador ON public.prospectos_reclutamiento(reclutador_id);
CREATE INDEX IF NOT EXISTS idx_prospectos_fecha ON public.prospectos_reclutamiento(fecha_captura DESC);
CREATE INDEX IF NOT EXISTS idx_actividad_prospecto ON public.actividad_reclutamiento(prospecto_id, created_at DESC);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_prospectos_updated_at
BEFORE UPDATE ON public.prospectos_reclutamiento
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Función para registrar cambios de estado
CREATE OR REPLACE FUNCTION public.registrar_cambio_estado_prospecto()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF OLD.estado_actual IS DISTINCT FROM NEW.estado_actual THEN
    INSERT INTO public.actividad_reclutamiento (
      prospecto_id,
      user_id,
      accion,
      estado_anterior,
      estado_nuevo
    ) VALUES (
      NEW.id,
      auth.uid(),
      'cambio_estado',
      OLD.estado_actual,
      NEW.estado_actual
    );
    
    NEW.fecha_ultimo_cambio = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para cambios de estado
CREATE TRIGGER on_estado_change
BEFORE UPDATE ON public.prospectos_reclutamiento
FOR EACH ROW
EXECUTE FUNCTION public.registrar_cambio_estado_prospecto();