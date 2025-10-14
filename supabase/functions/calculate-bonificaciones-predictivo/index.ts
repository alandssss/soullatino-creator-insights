import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mes_referencia } = await req.json();
    const mesRef = mes_referencia || new Date().toISOString().slice(0, 7) + '-01';

    console.log('Calculando bonificaciones para mes:', mesRef);

    // Ejecutar función de cálculo
    const { error: calcError } = await supabase.rpc('calcular_bonificaciones_mes', {
      p_mes_referencia: mesRef
    });

    if (calcError) {
      console.error('Error calculando bonificaciones:', calcError);
      throw calcError;
    }

    // Obtener resultados
    const { data: bonificaciones, error: fetchError } = await supabase
      .from('creator_bonificaciones')
      .select('*')
      .eq('mes_referencia', mesRef)
      .order('diam_live_mes', { ascending: false });

    if (fetchError) {
      console.error('Error obteniendo bonificaciones:', fetchError);
      throw fetchError;
    }

    console.log(`Bonificaciones calculadas: ${bonificaciones?.length || 0} creadores`);

    return new Response(
      JSON.stringify({
        success: true,
        mes_referencia: mesRef,
        total_creadores: bonificaciones?.length || 0,
        bonificaciones
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error en calculate-bonificaciones-predictivo:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});