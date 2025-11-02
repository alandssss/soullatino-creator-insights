import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[cron-daily-recompute] Starting daily recompute...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Refrescar vista materializada
    console.log('[cron-daily-recompute] Refreshing creator_riesgos_mes...');
    const { error: refreshError } = await supabase.rpc('refresh_creator_riesgos_mes');

    if (refreshError) {
      throw new Error(`Failed to refresh view: ${refreshError.message}`);
    }

    // Opcional: Recalcular bonificaciones para el mes actual
    const today = new Date();
    const mesReferencia = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;

    console.log('[cron-daily-recompute] Calculating bonificaciones for:', mesReferencia);
    const { error: bonifError } = await supabase.rpc('calcular_bonificaciones_mes', {
      p_mes_referencia: mesReferencia
    });

    if (bonifError) {
      console.warn('[cron-daily-recompute] Bonificaciones calc warning:', bonifError);
    }

    // Obtener estadísticas actualizadas
    const { data: riesgos } = await supabase
      .from('creator_riesgos_mes')
      .select('prioridad_riesgo, faltan_dias, faltan_horas');

    const summary = {
      total: riesgos?.length || 0,
      riesgo_alto: riesgos?.filter(r => r.prioridad_riesgo >= 40).length || 0,
      riesgo_medio: riesgos?.filter(r => r.prioridad_riesgo >= 20 && r.prioridad_riesgo < 40).length || 0,
      riesgo_bajo: riesgos?.filter(r => r.prioridad_riesgo < 20).length || 0,
    };

    console.log('[cron-daily-recompute] Completed successfully:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        summary
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[cron-daily-recompute] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
