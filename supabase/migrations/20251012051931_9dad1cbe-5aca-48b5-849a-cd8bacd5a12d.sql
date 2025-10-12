-- Fix whatsapp_activity_broadcast_trigger function to have explicit search_path for security
CREATE OR REPLACE FUNCTION public.whatsapp_activity_broadcast_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
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
$$;