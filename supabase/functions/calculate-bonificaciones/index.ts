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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { creatorId } = await req.json();

    if (!creatorId) {
      return new Response(
        JSON.stringify({ error: "creatorId es requerido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calcular fecha del mes actual
    const fechaReporte = new Date();
    const inicioMes = new Date(fechaReporte.getFullYear(), fechaReporte.getMonth(), 1);
    const mesReferencia = inicioMes.toISOString().split('T')[0];

    console.log(`Calculando bonificaciones para creator ${creatorId}, mes ${mesReferencia}`);

    // Ejecutar función SQL para calcular bonificaciones del mes
    const { error: calcError } = await supabaseClient.rpc('calcular_bonificaciones_mes', {
      mes_referencia: mesReferencia
    });

    if (calcError) {
      console.error('Error en calcular_bonificaciones_mes:', calcError);
      return new Response(
        JSON.stringify({ error: "Error al calcular bonificaciones" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obtener el resultado calculado
    const { data: bonificacion, error: fetchError } = await supabaseClient
      .from('creator_bonificaciones')
      .select('*')
      .eq('creator_id', creatorId)
      .eq('mes_referencia', mesReferencia)
      .single();

    if (fetchError || !bonificacion) {
      console.error('Error obteniendo bonificación:', fetchError);
      return new Response(
        JSON.stringify({ error: "No se encontraron datos para este creador" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Obtener nombre del creador para los mensajes
    const { data: creator } = await supabaseClient
      .from('creators')
      .select('nombre')
      .eq('id', creatorId)
      .single();


    // Generar mensaje para creador
    const mensajeCreador = generarMensajeCreador(bonificacion, creator?.nombre || 'Creador');
    
    // Generar mensaje para manager
    const mensajeManager = generarMensajeManager(bonificacion, creator?.nombre || 'Creador');

    console.log(`Bonificaciones calculadas exitosamente para ${creator?.nombre}`);

    return new Response(
      JSON.stringify({
        success: true,
        bonificacion,
        mensajes: {
          creador: mensajeCreador,
          manager: mensajeManager
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error en calculate-bonificaciones:', error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generarMensajeCreador(bonif: any, nombre: string): string {
  const objetivo = bonif.proximo_objetivo_valor || "Mantener rendimiento";
  const faltante = bonif.proximo_objetivo_tipo === "graduacion" 
    ? `${bonif.req_diam_por_dia?.toLocaleString() || 0} diamantes/día`
    : bonif.proximo_objetivo_tipo === "hito"
    ? `${bonif.req_horas_por_dia?.toFixed(1) || 0} horas/día`
    : "Continúa así";

  let mensaje = `🎯 Tu avance del mes (al día de ayer)\n\n`;
  mensaje += `📅 Días: ${bonif.dias_live_mes}\n`;
  mensaje += `⏰ Horas: ${bonif.horas_live_mes}\n`;
  mensaje += `💎 Diamantes: ${bonif.diam_live_mes?.toLocaleString()}\n\n`;
  mensaje += `🎯 Próximo objetivo: ${objetivo}\n`;
  mensaje += `📊 Te falta: ${faltante} en los ${bonif.dias_restantes} días restantes\n\n`;

  if (bonif.es_prioridad_300k) {
    mensaje += `⭐ ¡Prioriza alcanzar 300K este mes!\n`;
  }

  if (bonif.dias_extra_22 > 0) {
    mensaje += `🎁 Bono extra: $${bonif.bono_extra_usd} USD por ${bonif.dias_extra_22} días adicionales!\n`;
  }

  return mensaje;
}

function generarMensajeManager(bonif: any, nombre: string): string {
  let mensaje = `📊 ${nombre} — Reporte del mes\n\n`;
  mensaje += `LIVE mes: ${bonif.dias_live_mes}d / ${bonif.horas_live_mes}h / ${bonif.diam_live_mes?.toLocaleString()} 💎\n`;
  mensaje += `Restan: ${bonif.dias_restantes} días\n\n`;

  mensaje += `Hitos:\n`;
  mensaje += `${bonif.hito_12d_40h ? '✅' : '❌'} 12d/40h\n`;
  mensaje += `${bonif.hito_20d_60h ? '✅' : '❌'} 20d/60h\n`;
  mensaje += `${bonif.hito_22d_80h ? '✅' : '❌'} 22d/80h\n\n`;

  mensaje += `Graduaciones:\n`;
  mensaje += `${bonif.grad_50k ? '✅' : '❌'} 50K\n`;
  mensaje += `${bonif.grad_100k ? '✅' : '❌'} 100K\n`;
  mensaje += `${bonif.grad_300k ? '✅' : '❌'} 300K\n`;
  mensaje += `${bonif.grad_500k ? '✅' : '❌'} 500K\n`;
  mensaje += `${bonif.grad_1m ? '✅' : '❌'} 1M\n\n`;

  mensaje += `Requerido/día: ${bonif.req_diam_por_dia?.toLocaleString() || 0} diam · ${bonif.req_horas_por_dia?.toFixed(1) || 0}h\n`;
  mensaje += `Bono: ${bonif.dias_extra_22} días extra ⇒ $${bonif.bono_extra_usd}\n\n`;

  if (bonif.es_prioridad_300k) {
    mensaje += `⚠️ PRIORIDAD: Alcanzar 300K\n`;
  }

  if (bonif.cerca_de_objetivo) {
    mensaje += `🎯 ¡Cerca del objetivo!\n`;
  }

  return mensaje;
}
