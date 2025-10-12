-- Agregar columnas para métricas LIVE del mes en la tabla creators
ALTER TABLE public.creators
ADD COLUMN IF NOT EXISTS dias_live_mes integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS horas_live_mes numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS diam_live_mes bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS dias_en_agencia integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS ultimo_calculo_mes date DEFAULT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN public.creators.dias_live_mes IS 'Número de días válidos transmitidos del 1° del mes hasta ayer';
COMMENT ON COLUMN public.creators.horas_live_mes IS 'Horas transmitidas del 1° del mes hasta ayer';
COMMENT ON COLUMN public.creators.diam_live_mes IS 'Diamantes generados del 1° del mes hasta ayer';
COMMENT ON COLUMN public.creators.dias_en_agencia IS 'Días desde que el creador se unió a la agencia';
COMMENT ON COLUMN public.creators.ultimo_calculo_mes IS 'Última fecha en que se calcularon las métricas del mes';

-- Tabla para almacenar bonificaciones calculadas
CREATE TABLE IF NOT EXISTS public.creator_bonificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  fecha_calculo date NOT NULL DEFAULT CURRENT_DATE,
  mes_referencia date NOT NULL,
  
  -- Métricas base
  dias_live_mes integer NOT NULL DEFAULT 0,
  horas_live_mes numeric NOT NULL DEFAULT 0,
  diam_live_mes bigint NOT NULL DEFAULT 0,
  dias_restantes integer NOT NULL DEFAULT 0,
  
  -- Graduaciones alcanzadas
  grad_50k boolean DEFAULT false,
  grad_100k boolean DEFAULT false,
  grad_300k boolean DEFAULT false,
  grad_500k boolean DEFAULT false,
  grad_1m boolean DEFAULT false,
  
  -- Hitos alcanzados
  hito_12d_40h boolean DEFAULT false,
  hito_20d_60h boolean DEFAULT false,
  hito_22d_80h boolean DEFAULT false,
  
  -- Bono extra
  dias_extra_22 integer DEFAULT 0,
  bono_extra_usd numeric DEFAULT 0,
  
  -- Objetivos y requerimientos
  proximo_objetivo_tipo text,
  proximo_objetivo_valor text,
  req_diam_por_dia integer,
  req_horas_por_dia numeric,
  
  -- Metadata
  es_prioridad_300k boolean DEFAULT false,
  cerca_de_objetivo boolean DEFAULT false,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  UNIQUE(creator_id, mes_referencia)
);

-- Habilitar RLS en la nueva tabla
ALTER TABLE public.creator_bonificaciones ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para bonificaciones
CREATE POLICY "bonificaciones_read"
ON public.creator_bonificaciones
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'viewer'::app_role)
);

CREATE POLICY "bonificaciones_write"
ON public.creator_bonificaciones
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin'::app_role, 'manager'::app_role)
  )
);

CREATE POLICY "bonificaciones_update"
ON public.creator_bonificaciones
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin'::app_role, 'manager'::app_role)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin'::app_role, 'manager'::app_role)
  )
);

CREATE POLICY "bonificaciones_delete"
ON public.creator_bonificaciones
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin'::app_role, 'manager'::app_role)
  )
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_bonificaciones_creator_mes 
ON public.creator_bonificaciones(creator_id, mes_referencia DESC);

CREATE INDEX IF NOT EXISTS idx_bonificaciones_fecha_calculo 
ON public.creator_bonificaciones(fecha_calculo DESC);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_bonificaciones_updated_at
BEFORE UPDATE ON public.creator_bonificaciones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();