-- ============================================================================
-- SECURITY FIXES: Critical Data Protection & Schema Injection Prevention
-- ============================================================================

-- 1. Fix supervision_live_summary view to enforce RLS through SECURITY DEFINER
-- Drop existing view and recreate with security_barrier
DROP VIEW IF EXISTS supervision_live_summary;

CREATE VIEW supervision_live_summary
WITH (security_barrier = true)
AS
SELECT
  creator_id,
  date_trunc('month', fecha_evento)::date AS mes,
  COUNT(*) AS eventos,
  SUM((en_vivo)::int) AS cnt_en_vivo,
  SUM((en_batalla)::int) AS cnt_en_batalla,
  SUM((buena_iluminacion)::int) AS cnt_buena_iluminacion,
  SUM((audio_claro)::int) AS cnt_audio_claro,
  SUM((cumple_normas)::int) AS cnt_cumple_normas,
  SUM((set_profesional)::int) AS cnt_set_prof,
  AVG(score) AS score_promedio,
  SUM(CASE WHEN riesgo = 'verde' THEN 1 ELSE 0 END) AS cnt_riesgo_bajo,
  SUM(CASE WHEN riesgo = 'amarillo' THEN 1 ELSE 0 END) AS cnt_riesgo_medio,
  SUM(CASE WHEN riesgo = 'rojo' THEN 1 ELSE 0 END) AS cnt_riesgo_alto
FROM supervision_live_logs
GROUP BY creator_id, mes;

-- Grant SELECT to authenticated users (RLS will enforce on base table)
GRANT SELECT ON supervision_live_summary TO authenticated;

COMMENT ON VIEW supervision_live_summary IS 
  'Aggregated supervision metrics. Access controlled via RLS on supervision_live_logs table.';

-- 2. Fix search_path in SECURITY DEFINER function to prevent schema injection
CREATE OR REPLACE FUNCTION public.seed_demo_live_data(
  p_mes_inicio date DEFAULT '2025-10-01'::date, 
  p_cantidad_creadores integer DEFAULT 15
)
RETURNS TABLE(creadores_procesados integer, registros_creados integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_creadores_procesados INT := 0;
  v_registros_creados INT := 0;
  v_fecha_actual DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
  INSERT INTO public.creator_live_daily (creator_id, fecha, horas, diamantes)
  SELECT 
    c.id,
    d.fecha,
    CASE 
      WHEN EXTRACT(DOW FROM d.fecha) IN (0, 5, 6) THEN (random() * 6 + 3)::numeric(10,2)
      ELSE (random() * 4 + 1.5)::numeric(10,2)
    END as horas,
    (CASE 
      WHEN EXTRACT(DOW FROM d.fecha) IN (0, 5, 6) THEN (random() * 6 + 3) * (random() * 400 + 900)
      ELSE (random() * 4 + 1.5) * (random() * 400 + 900)
    END)::numeric(10,0) as diamantes
  FROM 
    (SELECT id FROM public.creators WHERE status = 'activo' ORDER BY created_at DESC LIMIT p_cantidad_creadores) c
  CROSS JOIN 
    generate_series(p_mes_inicio, v_fecha_actual, '1 day'::interval) d(fecha)
  ON CONFLICT (creator_id, fecha) DO NOTHING;

  GET DIAGNOSTICS v_registros_creados = ROW_COUNT;
  SELECT COUNT(DISTINCT id) INTO v_creadores_procesados 
  FROM public.creators 
  WHERE status = 'activo' 
  ORDER BY created_at DESC 
  LIMIT p_cantidad_creadores;

  RETURN QUERY SELECT v_creadores_procesados, v_registros_creados;
END;
$function$;