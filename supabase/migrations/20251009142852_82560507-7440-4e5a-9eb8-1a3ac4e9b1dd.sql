-- Crear tabla para estadísticas diarias (snapshots históricos)
CREATE TABLE public.creator_daily_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  days_since_joining INTEGER DEFAULT 0,
  live_duration_l30d NUMERIC DEFAULT 0,
  diamonds_l30d BIGINT DEFAULT 0,
  diamond_baseline BIGINT DEFAULT 0,
  ingreso_estimado NUMERIC DEFAULT 0,
  followers BIGINT DEFAULT 0,
  engagement_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraint: Un solo snapshot por creador por día
  UNIQUE(creator_id, snapshot_date)
);

-- Habilitar RLS
ALTER TABLE public.creator_daily_stats ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "daily_stats_read" 
ON public.creator_daily_stats 
FOR SELECT 
USING (true);

CREATE POLICY "daily_stats_write" 
ON public.creator_daily_stats 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'manager')
  )
);

CREATE POLICY "daily_stats_update" 
ON public.creator_daily_stats 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'manager')
  )
);

CREATE POLICY "daily_stats_delete" 
ON public.creator_daily_stats 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'manager')
  )
);

-- Índices para mejorar rendimiento de queries
CREATE INDEX idx_creator_daily_stats_creator_id ON public.creator_daily_stats(creator_id);
CREATE INDEX idx_creator_daily_stats_snapshot_date ON public.creator_daily_stats(snapshot_date DESC);
CREATE INDEX idx_creator_daily_stats_creator_date ON public.creator_daily_stats(creator_id, snapshot_date DESC);