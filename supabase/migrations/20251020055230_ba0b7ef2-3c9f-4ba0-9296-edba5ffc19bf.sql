-- Corregir las funciones que faltan con search_path
-- Estas son las funciones auxiliares de scoring que el linter detectó

-- Función: supervision_compute_score
CREATE OR REPLACE FUNCTION public.supervision_compute_score(
  _en_vivo boolean, 
  _en_batalla boolean, 
  _buena_iluminacion boolean, 
  _cumple_normas boolean, 
  _audio_claro boolean, 
  _set_profesional boolean, 
  _severidad text
)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $function$
DECLARE
  s int := 0;
BEGIN
  IF _en_vivo THEN s := s + 1; END IF;
  IF _en_batalla THEN s := s + 2; END IF;
  IF _buena_iluminacion THEN s := s + 1; END IF;
  IF _audio_claro THEN s := s + 1; END IF;
  IF _set_profesional THEN s := s + 1; END IF;
  IF _cumple_normas = false THEN s := s - 4; END IF;

  IF _severidad = 'media' THEN s := s - 3; END IF;
  IF _severidad = 'alta' THEN s := s - 7; END IF;

  RETURN s;
END;
$function$;

-- Función: supervision_score_to_risk
CREATE OR REPLACE FUNCTION public.supervision_score_to_risk(_score integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_catalog
AS $function$
BEGIN
  IF _score >= 2 THEN RETURN 'verde'; END IF;
  IF _score >= -1 THEN RETURN 'amarillo'; END IF;
  RETURN 'rojo';
END;
$function$;

-- Función: update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;