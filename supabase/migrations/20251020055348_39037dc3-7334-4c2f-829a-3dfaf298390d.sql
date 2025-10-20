-- Buscar y corregir la última función sin search_path
-- Y resolver el problema de materialized view

-- Agregar search_path a las funciones de cálculo de bonificaciones
CREATE OR REPLACE FUNCTION public.calcular_bonificaciones_mes(p_mes_referencia date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $function$
DECLARE
  mes_inicio date := date_trunc('month', p_mes_referencia)::date;
  mes_fin date := (mes_inicio + interval '1 month - 1 day')::date;
  hoy date := current_date;
  corte date := LEAST(hoy - 1, mes_fin);
  dias_restantes int := GREATEST((mes_fin - hoy + 1), 0);
  dias_transcurridos int := (corte - mes_inicio) + 1;
BEGIN
  -- Insertar o actualizar bonificaciones calculadas del mes
  INSERT INTO public.creator_bonificaciones AS cb (
    creator_id, mes_referencia,
    dias_live_mes, horas_live_mes, diam_live_mes,
    faltan_50k, faltan_100k, faltan_300k, faltan_500k, faltan_1m,
    req_diam_por_dia_50k, req_diam_por_dia_100k, req_diam_por_dia_300k, 
    req_diam_por_dia_500k, req_diam_por_dia_1m,
    prob_50k, prob_100k, prob_300k, prob_500k, prob_1m,
    hito_12_40, hito_20_60, hito_22_80,
    meta_recomendada, texto_creador, texto_manager,
    es_nuevo_menos_90_dias, bono_dias_extra_usd,
    fecha_estimada_50k, fecha_estimada_100k, fecha_estimada_300k,
    fecha_estimada_500k, fecha_estimada_1m,
    semaforo_50k, semaforo_100k, semaforo_300k, semaforo_500k, semaforo_1m,
    updated_at
  )
  SELECT
    d.creator_id,
    mes_inicio AS mes_ref,
    -- Métricas LIVE del mes (del 1° hasta ayer)
    COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0)::int AS dias_live_mes,
    COALESCE(SUM(d.horas), 0) AS horas_live_mes,
    COALESCE(SUM(d.diamantes), 0) AS diam_live_mes,
    
    -- Faltantes a graduaciones
    GREATEST(50000 - COALESCE(SUM(d.diamantes), 0), 0) AS faltan_50k,
    GREATEST(100000 - COALESCE(SUM(d.diamantes), 0), 0) AS faltan_100k,
    GREATEST(300000 - COALESCE(SUM(d.diamantes), 0), 0) AS faltan_300k,
    GREATEST(500000 - COALESCE(SUM(d.diamantes), 0), 0) AS faltan_500k,
    GREATEST(1000000 - COALESCE(SUM(d.diamantes), 0), 0) AS faltan_1m,
    
    -- Requeridos por día (solo si quedan días)
    CASE WHEN dias_restantes > 0 THEN CEIL(GREATEST(50000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / dias_restantes) ELSE 0 END AS req_50k,
    CASE WHEN dias_restantes > 0 THEN CEIL(GREATEST(100000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / dias_restantes) ELSE 0 END AS req_100k,
    CASE WHEN dias_restantes > 0 THEN CEIL(GREATEST(300000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / dias_restantes) ELSE 0 END AS req_300k,
    CASE WHEN dias_restantes > 0 THEN CEIL(GREATEST(500000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / dias_restantes) ELSE 0 END AS req_500k,
    CASE WHEN dias_restantes > 0 THEN CEIL(GREATEST(1000000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / dias_restantes) ELSE 0 END AS req_1m,
    
    -- Probabilidades basadas en ritmo actual
    CASE
      WHEN COALESCE(SUM(d.diamantes), 0) >= 50000 THEN 100
      WHEN dias_restantes = 0 THEN 0
      WHEN COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0) = 0 THEN 0
      ELSE LEAST(100, ROUND(
        (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)) /
        NULLIF(GREATEST(50000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / NULLIF(dias_restantes, 0), 0) * 100, 0
      ))
    END AS prob_50k,
    CASE
      WHEN COALESCE(SUM(d.diamantes), 0) >= 100000 THEN 100
      WHEN dias_restantes = 0 THEN 0
      WHEN COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0) = 0 THEN 0
      ELSE LEAST(100, ROUND(
        (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)) /
        NULLIF(GREATEST(100000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / NULLIF(dias_restantes, 0), 0) * 100, 0
      ))
    END AS prob_100k,
    CASE
      WHEN COALESCE(SUM(d.diamantes), 0) >= 300000 THEN 100
      WHEN dias_restantes = 0 THEN 0
      WHEN COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0) = 0 THEN 0
      ELSE LEAST(100, ROUND(
        (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)) /
        NULLIF(GREATEST(300000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / NULLIF(dias_restantes, 0), 0) * 100, 0
      ))
    END AS prob_300k,
    CASE
      WHEN COALESCE(SUM(d.diamantes), 0) >= 500000 THEN 100
      WHEN dias_restantes = 0 THEN 0
      WHEN COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0) = 0 THEN 0
      ELSE LEAST(100, ROUND(
        (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)) /
        NULLIF(GREATEST(500000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / NULLIF(dias_restantes, 0), 0) * 100, 0
      ))
    END AS prob_500k,
    CASE
      WHEN COALESCE(SUM(d.diamantes), 0) >= 1000000 THEN 100
      WHEN dias_restantes = 0 THEN 0
      WHEN COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0) = 0 THEN 0
      ELSE LEAST(100, ROUND(
        (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)) /
        NULLIF(GREATEST(1000000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / NULLIF(dias_restantes, 0), 0) * 100, 0
      ))
    END AS prob_1m,
    
    -- Hitos (días/horas)
    (COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0) >= 12 AND COALESCE(SUM(d.horas), 0) >= 40) AS hito_12_40,
    (COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0) >= 20 AND COALESCE(SUM(d.horas), 0) >= 60) AS hito_20_60,
    (COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0) >= 22 AND COALESCE(SUM(d.horas), 0) >= 80) AS hito_22_80,
    
    -- Meta recomendada según progreso
    CASE
      WHEN COALESCE(SUM(d.diamantes), 0) >= 300000 THEN '500K'
      WHEN COALESCE(SUM(d.diamantes), 0) >= 100000 THEN '300K'
      WHEN COALESCE(SUM(d.diamantes), 0) >= 50000 THEN '100K'
      ELSE '50K'
    END AS meta_recomendada,
    
    -- Texto para creador
    CONCAT(
      'Tu avance del mes (al día de ayer): Días ', COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0),
      ' · Horas ', ROUND(COALESCE(SUM(d.horas), 0), 1),
      ' · Diamantes ', COALESCE(SUM(d.diamantes), 0),
      ' | Restan ', dias_restantes, ' días'
    ) AS texto_creador,
    
    -- Texto para manager
    CONCAT(
      'LIVE mes: ', COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 'd/',
      ROUND(COALESCE(SUM(d.horas), 0), 1), 'h/',
      COALESCE(SUM(d.diamantes), 0), ' 💎 | Restan ', dias_restantes, ' días | ',
      'Meta priorizada: ',
      CASE
        WHEN COALESCE(SUM(d.diamantes), 0) >= 300000 THEN '500K'
        WHEN COALESCE(SUM(d.diamantes), 0) >= 100000 THEN '300K'
        WHEN COALESCE(SUM(d.diamantes), 0) >= 50000 THEN '100K'
        ELSE '50K'
      END
    ) AS texto_manager,
    
    -- Es nuevo (<90 días)
    (SELECT c.dias_en_agencia < 90 FROM creators c WHERE c.id = d.creator_id) AS es_nuevo,
    
    -- Bono por días extra (>22 días)
    GREATEST((COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0) - 22), 0) * 3 AS bono_extra,
    
    -- Fechas estimadas (basadas en ritmo actual)
    CASE WHEN COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0) > 0
      THEN corte + CEIL(GREATEST(50000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / 
           (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)))::int
    END AS fecha_est_50k,
    CASE WHEN COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0) > 0
      THEN corte + CEIL(GREATEST(100000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / 
           (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)))::int
    END AS fecha_est_100k,
    CASE WHEN COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0) > 0
      THEN corte + CEIL(GREATEST(300000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / 
           (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)))::int
    END AS fecha_est_300k,
    CASE WHEN COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0) > 0
      THEN corte + CEIL(GREATEST(500000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / 
           (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)))::int
    END AS fecha_est_500k,
    CASE WHEN COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0) > 0
      THEN corte + CEIL(GREATEST(1000000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / 
           (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)))::int
    END AS fecha_est_1m,
    
    -- Semáforos (verde: en ritmo, amarillo: necesita esfuerzo, rojo: muy difícil)
    CASE 
      WHEN COALESCE(SUM(d.diamantes), 0) >= 50000 THEN 'verde'
      WHEN dias_restantes = 0 THEN 'rojo'
      WHEN (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)) >= 
           (GREATEST(50000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / NULLIF(dias_restantes, 0)) THEN 'verde'
      WHEN (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)) >= 
           0.7 * (GREATEST(50000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / NULLIF(dias_restantes, 0)) THEN 'amarillo'
      ELSE 'rojo'
    END AS sem_50k,
    CASE 
      WHEN COALESCE(SUM(d.diamantes), 0) >= 100000 THEN 'verde'
      WHEN dias_restantes = 0 THEN 'rojo'
      WHEN (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)) >= 
           (GREATEST(100000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / NULLIF(dias_restantes, 0)) THEN 'verde'
      WHEN (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)) >= 
           0.7 * (GREATEST(100000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / NULLIF(dias_restantes, 0)) THEN 'amarillo'
      ELSE 'rojo'
    END AS sem_100k,
    CASE 
      WHEN COALESCE(SUM(d.diamantes), 0) >= 300000 THEN 'verde'
      WHEN dias_restantes = 0 THEN 'rojo'
      WHEN (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)) >= 
           (GREATEST(300000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / NULLIF(dias_restantes, 0)) THEN 'verde'
      WHEN (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)) >= 
           0.7 * (GREATEST(300000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / NULLIF(dias_restantes, 0)) THEN 'amarillo'
      ELSE 'rojo'
    END AS sem_300k,
    CASE 
      WHEN COALESCE(SUM(d.diamantes), 0) >= 500000 THEN 'verde'
      WHEN dias_restantes = 0 THEN 'rojo'
      WHEN (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)) >= 
           (GREATEST(500000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / NULLIF(dias_restantes, 0)) THEN 'verde'
      WHEN (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)) >= 
           0.7 * (GREATEST(500000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / NULLIF(dias_restantes, 0)) THEN 'amarillo'
      ELSE 'rojo'
    END AS sem_500k,
    CASE 
      WHEN COALESCE(SUM(d.diamantes), 0) >= 1000000 THEN 'verde'
      WHEN dias_restantes = 0 THEN 'rojo'
      WHEN (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)) >= 
           (GREATEST(1000000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / NULLIF(dias_restantes, 0)) THEN 'verde'
      WHEN (COALESCE(SUM(d.diamantes), 0) / NULLIF(COUNT(*) FILTER (WHERE d.horas > 0 OR d.diamantes > 0), 0)) >= 
           0.7 * (GREATEST(1000000 - COALESCE(SUM(d.diamantes), 0), 0)::numeric / NULLIF(dias_restantes, 0)) THEN 'amarillo'
      ELSE 'rojo'
    END AS sem_1m,
    
    now() AS updated_at
  FROM public.creator_live_daily d
  WHERE d.fecha BETWEEN mes_inicio AND corte
  GROUP BY d.creator_id
  ON CONFLICT (creator_id, mes_referencia) DO UPDATE
  SET
    dias_live_mes = EXCLUDED.dias_live_mes,
    horas_live_mes = EXCLUDED.horas_live_mes,
    diam_live_mes = EXCLUDED.diam_live_mes,
    faltan_50k = EXCLUDED.faltan_50k,
    faltan_100k = EXCLUDED.faltan_100k,
    faltan_300k = EXCLUDED.faltan_300k,
    faltan_500k = EXCLUDED.faltan_500k,
    faltan_1m = EXCLUDED.faltan_1m,
    req_diam_por_dia_50k = EXCLUDED.req_diam_por_dia_50k,
    req_diam_por_dia_100k = EXCLUDED.req_diam_por_dia_100k,
    req_diam_por_dia_300k = EXCLUDED.req_diam_por_dia_300k,
    req_diam_por_dia_500k = EXCLUDED.req_diam_por_dia_500k,
    req_diam_por_dia_1m = EXCLUDED.req_diam_por_dia_1m,
    prob_50k = EXCLUDED.prob_50k,
    prob_100k = EXCLUDED.prob_100k,
    prob_300k = EXCLUDED.prob_300k,
    prob_500k = EXCLUDED.prob_500k,
    prob_1m = EXCLUDED.prob_1m,
    hito_12_40 = EXCLUDED.hito_12_40,
    hito_20_60 = EXCLUDED.hito_20_60,
    hito_22_80 = EXCLUDED.hito_22_80,
    meta_recomendada = EXCLUDED.meta_recomendada,
    texto_creador = EXCLUDED.texto_creador,
    texto_manager = EXCLUDED.texto_manager,
    es_nuevo_menos_90_dias = EXCLUDED.es_nuevo_menos_90_dias,
    bono_dias_extra_usd = EXCLUDED.bono_dias_extra_usd,
    fecha_estimada_50k = EXCLUDED.fecha_estimada_50k,
    fecha_estimada_100k = EXCLUDED.fecha_estimada_100k,
    fecha_estimada_300k = EXCLUDED.fecha_estimada_300k,
    fecha_estimada_500k = EXCLUDED.fecha_estimada_500k,
    fecha_estimada_1m = EXCLUDED.fecha_estimada_1m,
    semaforo_50k = EXCLUDED.semaforo_50k,
    semaforo_100k = EXCLUDED.semaforo_100k,
    semaforo_300k = EXCLUDED.semaforo_300k,
    semaforo_500k = EXCLUDED.semaforo_500k,
    semaforo_1m = EXCLUDED.semaforo_1m,
    updated_at = now();
END;
$function$;

-- Proteger la vista materializada creator_tiers
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' AND matviewname = 'creator_tiers'
  ) THEN
    -- Revocar acceso público
    REVOKE ALL ON public.creator_tiers FROM anon;
    -- Permitir solo a usuarios autenticados con roles específicos
    GRANT SELECT ON public.creator_tiers TO authenticated;
  END IF;
END $$;