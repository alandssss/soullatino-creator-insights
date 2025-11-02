-- Tabla de batallas
CREATE TABLE IF NOT EXISTS public.batallas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  hora time NOT NULL,
  oponente text NOT NULL,
  guantes boolean DEFAULT false,
  reto text,
  tipo text CHECK (tipo IN ('1v1', '3v3')) NOT NULL DEFAULT '1v1',
  estado text CHECK (estado IN ('pendiente', 'confirmada', 'completada', 'cancelada')) DEFAULT 'pendiente',
  notificacion_enviada boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batallas_creator ON public.batallas(creator_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_batallas_estado ON public.batallas(estado);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_batallas_updated_at
BEFORE UPDATE ON public.batallas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabla de logs de WhatsApp (específica para Twilio)
CREATE TABLE IF NOT EXISTS public.logs_whatsapp (
  id bigserial PRIMARY KEY,
  batalla_id uuid REFERENCES public.batallas(id) ON DELETE SET NULL,
  telefono text NOT NULL,
  mensaje_enviado text NOT NULL,
  respuesta jsonb,
  twilio_message_sid text,
  twilio_status text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logs_whatsapp_batalla ON public.logs_whatsapp(batalla_id);
CREATE INDEX IF NOT EXISTS idx_logs_whatsapp_created ON public.logs_whatsapp(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.batallas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_whatsapp ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para batallas
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'batallas' AND policyname = 'batallas_read'
  ) THEN
    CREATE POLICY batallas_read ON public.batallas
      FOR SELECT
      USING (
        has_role(auth.uid(), 'admin'::app_role) OR 
        has_role(auth.uid(), 'manager'::app_role) OR 
        has_role(auth.uid(), 'viewer'::app_role)
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'batallas' AND policyname = 'batallas_write'
  ) THEN
    CREATE POLICY batallas_write ON public.batallas
      FOR INSERT
      WITH CHECK (
        has_role(auth.uid(), 'admin'::app_role) OR 
        has_role(auth.uid(), 'manager'::app_role)
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'batallas' AND policyname = 'batallas_update'
  ) THEN
    CREATE POLICY batallas_update ON public.batallas
      FOR UPDATE
      USING (
        has_role(auth.uid(), 'admin'::app_role) OR 
        has_role(auth.uid(), 'manager'::app_role)
      )
      WITH CHECK (
        has_role(auth.uid(), 'admin'::app_role) OR 
        has_role(auth.uid(), 'manager'::app_role)
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'batallas' AND policyname = 'batallas_delete'
  ) THEN
    CREATE POLICY batallas_delete ON public.batallas
      FOR DELETE
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Políticas RLS para logs_whatsapp
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'logs_whatsapp' AND policyname = 'logs_whatsapp_read'
  ) THEN
    CREATE POLICY logs_whatsapp_read ON public.logs_whatsapp
      FOR SELECT
      USING (
        has_role(auth.uid(), 'admin'::app_role) OR 
        has_role(auth.uid(), 'manager'::app_role)
      );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'logs_whatsapp' AND policyname = 'logs_whatsapp_write'
  ) THEN
    CREATE POLICY logs_whatsapp_write ON public.logs_whatsapp
      FOR INSERT
      WITH CHECK (
        has_role(auth.uid(), 'admin'::app_role) OR 
        has_role(auth.uid(), 'manager'::app_role)
      );
  END IF;
END $$;