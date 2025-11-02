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
    console.log('[get-recommendations-today] Starting...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener recomendaciones ordenadas por prioridad
    const { data: recommendations, error } = await supabase
      .from('creator_riesgos_mes')
      .select('*')
      .order('prioridad_riesgo', { ascending: false })
      .order('faltan_dias', { ascending: false })
      .order('faltan_horas', { ascending: false });

    if (error) {
      throw error;
    }

    // Calcular resumen
    const summary = {
      total: recommendations?.length || 0,
      riesgo_alto: recommendations?.filter(r => r.prioridad_riesgo >= 40).length || 0,
      riesgo_medio: recommendations?.filter(r => r.prioridad_riesgo >= 20 && r.prioridad_riesgo < 40).length || 0,
      riesgo_bajo: recommendations?.filter(r => r.prioridad_riesgo < 20).length || 0,
      con_deficit_dias: recommendations?.filter(r => r.faltan_dias > 0).length || 0,
      con_deficit_horas: recommendations?.filter(r => r.faltan_horas > 0).length || 0,
    };

    console.log('[get-recommendations-today] Returning', recommendations?.length, 'recommendations');

    return new Response(
      JSON.stringify({
        success: true,
        recommendations: recommendations || [],
        summary
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[get-recommendations-today] Error:', error);
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
