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

    // Obtener datos del creador
    const { data: creator, error: creatorError } = await supabaseClient
      .from('creators')
      .select('*')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      return new Response(
        JSON.stringify({ error: "Creador no encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Cálculos de fecha
    const fechaReporte = new Date();
    const inicioMes = new Date(fechaReporte.getFullYear(), fechaReporte.getMonth(), 1);
    const ultimoDiaMes = new Date(fechaReporte.getFullYear(), fechaReporte.getMonth() + 1, 0);
    const diasRestantes = Math.max(0, Math.ceil((ultimoDiaMes.getTime() - fechaReporte.getTime()) / (1000 * 60 * 60 * 24)));

    // Métricas LIVE del mes (del creador)
    const diasLiveMes = creator.dias_live_mes || 0;
    const horasLiveMes = creator.horas_live_mes || 0;
    const diamLiveMes = creator.diam_live_mes || 0;
    const diasEnAgencia = creator.dias_en_agencia || 0;

    // Graduaciones
    const graduaciones = [
      { valor: 50000, label: "50K", key: "grad_50k" },
      { valor: 100000, label: "100K", key: "grad_100k" },
      { valor: 300000, label: "300K", key: "grad_300k" },
      { valor: 500000, label: "500K", key: "grad_500k" },
      { valor: 1000000, label: "1M", key: "grad_1m" }
    ];

    const gradAlcanzadas: any = {};
    let proximaGrad: any = null;
    let faltanDiam = 0;
    let reqDiamPorDia = 0;

    for (const grad of graduaciones) {
      gradAlcanzadas[grad.key] = diamLiveMes >= grad.valor;
      if (!proximaGrad && diamLiveMes < grad.valor) {
        proximaGrad = grad;
        faltanDiam = Math.max(0, grad.valor - diamLiveMes);
        reqDiamPorDia = diasRestantes > 0 ? Math.ceil(faltanDiam / diasRestantes) : 0;
      }
    }

    // Hitos
    const hitos = [
      { dias: 12, horas: 40, label: "12d/40h", key: "hito_12d_40h" },
      { dias: 20, horas: 60, label: "20d/60h", key: "hito_20d_60h" },
      { dias: 22, horas: 80, label: "22d/80h", key: "hito_22d_80h" }
    ];

    const hitosAlcanzados: any = {};
    let proximoHito: any = null;
    let faltanDias = 0;
    let faltanHoras = 0;
    let reqHorasPorDia = 0;

    for (const hito of hitos) {
      const alcanzado = (diasLiveMes >= hito.dias) && (horasLiveMes >= hito.horas);
      hitosAlcanzados[hito.key] = alcanzado;
      
      if (!proximoHito && !alcanzado) {
        proximoHito = hito;
        faltanDias = Math.max(0, hito.dias - diasLiveMes);
        faltanHoras = Math.max(0, hito.horas - horasLiveMes);
        reqHorasPorDia = diasRestantes > 0 ? Math.ceil(faltanHoras / diasRestantes) : 0;
      }
    }

    // Bono extra (días > 22)
    const diasExtra = Math.max(0, diasLiveMes - 22);
    const bonoExtraUsd = diasExtra * 3;

    // Prioridad <90 días: 300K
    const esPrioridad300k = diasEnAgencia < 90 && diamLiveMes < 300000;

    // ¿Cerca del objetivo?
    let cercaObjetivo = false;
    if (proximaGrad) {
      cercaObjetivo = faltanDiam <= (proximaGrad.valor * 0.10) || faltanDiam <= 5000;
    }
    if (!cercaObjetivo && proximoHito) {
      cercaObjetivo = faltanDias <= 3 || faltanHoras <= 5;
    }

    // Determinar próximo objetivo
    let proximoObjetivoTipo = "";
    let proximoObjetivoValor = "";

    if (esPrioridad300k) {
      proximoObjetivoTipo = "graduacion_prioritaria";
      proximoObjetivoValor = "300K Diamantes";
    } else if (proximaGrad) {
      proximoObjetivoTipo = "graduacion";
      proximoObjetivoValor = `${proximaGrad.label} Diamantes`;
    } else if (proximoHito) {
      proximoObjetivoTipo = "hito";
      proximoObjetivoValor = proximoHito.label;
    }

    // Guardar en BD
    const bonificacionData = {
      creator_id: creatorId,
      mes_referencia: inicioMes.toISOString().split('T')[0],
      fecha_calculo: fechaReporte.toISOString().split('T')[0],
      dias_live_mes: diasLiveMes,
      horas_live_mes: horasLiveMes,
      diam_live_mes: diamLiveMes,
      dias_restantes: diasRestantes,
      ...gradAlcanzadas,
      ...hitosAlcanzados,
      dias_extra_22: diasExtra,
      bono_extra_usd: bonoExtraUsd,
      proximo_objetivo_tipo: proximoObjetivoTipo,
      proximo_objetivo_valor: proximoObjetivoValor,
      req_diam_por_dia: reqDiamPorDia,
      req_horas_por_dia: reqHorasPorDia,
      es_prioridad_300k: esPrioridad300k,
      cerca_de_objetivo: cercaObjetivo
    };

    const { data: bonificacion, error: bonifError } = await supabaseClient
      .from('creator_bonificaciones')
      .upsert(bonificacionData, { 
        onConflict: 'creator_id,mes_referencia',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (bonifError) {
      console.error('Error guardando bonificación:', bonifError);
      return new Response(
        JSON.stringify({ error: "Error al guardar bonificación" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generar mensaje para creador
    const mensajeCreador = generarMensajeCreador(bonificacion, creator.nombre);
    
    // Generar mensaje para manager
    const mensajeManager = generarMensajeManager(bonificacion, creator.nombre);

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
