-- =========================================
-- MIGRACIÓN DE SEGURIDAD PARA PRODUCCIÓN
-- =========================================

-- 1. AGREGAR RLS A LA VISTA supervision_live_summary
ALTER VIEW public.supervision_live_summary SET (security_invoker = true);

-- Nota: Como es una vista, usamos security_invoker en lugar de RLS tradicional
-- Esto hace que la vista use los permisos del usuario que la consulta

-- 2. CORREGIR FUNCIONES SECURITY DEFINER (agregar search_path explícito)

-- Función: registrar_cambio_estado_prospecto
CREATE OR REPLACE FUNCTION public.registrar_cambio_estado_prospecto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
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
$function$;

-- Función: whatsapp_activity_broadcast_trigger
CREATE OR REPLACE FUNCTION public.whatsapp_activity_broadcast_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
  PERFORM realtime.broadcast_changes(
    'whatsapp:' || COALESCE(NEW.creator_id, OLD.creator_id)::text,
    TG_OP,
    TG_OP,
    TG_TABLE_NAME,
    TG_TABLE_SCHEMA,
    NEW,
    OLD
  );
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Función: supervision_live_logs_aiu
CREATE OR REPLACE FUNCTION public.supervision_live_logs_aiu()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  s int;
BEGIN
  s := public.supervision_compute_score(
    NEW.en_vivo,
    NEW.en_batalla,
    NEW.buena_iluminacion,
    NEW.cumple_normas,
    NEW.audio_claro,
    NEW.set_profesional,
    NEW.severidad
  );
  NEW.score := s;
  NEW.riesgo := public.supervision_score_to_risk(s);
  RETURN NEW;
END;
$function$;

-- 3. AGREGAR POLÍTICAS RLS PARA supervision_live_summary
-- Crear una tabla de respaldo si supervision_live_summary es una vista materializada
-- Para poder aplicar RLS, necesitamos verificar que los usuarios tengan los roles apropiados

-- Política de lectura para la vista (requiere admin, manager o supervisor)
CREATE POLICY "supervision_summary_read"
ON public.supervision_live_logs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'supervisor'::app_role)
);

-- 4. ASEGURAR QUE TODAS LAS TABLAS SENSIBLES TENGAN RLS HABILITADO
-- Verificar que creator_bonificaciones esté protegida (ya tiene RLS)
-- Verificar que creator_live_daily esté protegida (ya tiene RLS)

-- 5. CREAR ÍNDICES PARA OPTIMIZAR CONSULTAS DE RLS
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);
CREATE INDEX IF NOT EXISTS idx_creator_bonificaciones_mes ON public.creator_bonificaciones(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_creator_live_daily_fecha ON public.creator_live_daily(fecha);
CREATE INDEX IF NOT EXISTS idx_supervision_logs_fecha ON public.supervision_live_logs(fecha_evento);

-- 6. COMENTARIOS DE DOCUMENTACIÓN
COMMENT ON FUNCTION public.has_role(uuid, app_role) IS 
'Función de seguridad que verifica si un usuario tiene un rol específico. 
Usa SECURITY DEFINER para evitar recursión en RLS.';

COMMENT ON TABLE public.creator_bonificaciones IS 
'Tabla de bonificaciones calculadas mensualmente. 
Acceso restringido por RLS a usuarios con roles admin, manager o viewer.';

COMMENT ON TABLE public.supervision_live_logs IS 
'Registros de supervisión de transmisiones en vivo. 
Acceso restringido a admin, manager y supervisor.';
