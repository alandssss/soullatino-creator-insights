-- Función para crear datos demo de live para el mes actual
-- Genera datos realistas con patrón de fin de semana y diamantes proporcionales
CREATE OR REPLACE FUNCTION public.seed_demo_live_data(
  p_mes_inicio DATE DEFAULT '2025-10-01',
  p_cantidad_creadores INT DEFAULT 15
)
RETURNS TABLE (
  creadores_procesados INT,
  registros_creados INT
) AS $$
DECLARE
  v_creadores_procesados INT := 0;
  v_registros_creados INT := 0;
  v_fecha_actual DATE := CURRENT_DATE - INTERVAL '1 day'; -- Hasta ayer
BEGIN
  -- Insertar datos para los primeros N creadores activos
  INSERT INTO public.creator_live_daily (creator_id, fecha, horas, diamantes)
  SELECT 
    c.id,
    d.fecha,
    -- Patrón realista: más horas en fines de semana (viernes-domingo)
    CASE 
      WHEN EXTRACT(DOW FROM d.fecha) IN (0, 5, 6) THEN (random() * 6 + 3)::numeric(10,2)
      ELSE (random() * 4 + 1.5)::numeric(10,2)
    END as horas,
    -- Diamantes proporcionales a horas (aprox 900-1300 por hora)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;