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

    // Obtener todos los creadores
    const { data: creators, error: creatorsError } = await supabaseClient
      .from('creators')
      .select('*')
      .order('nombre');

    if (creatorsError || !creators) {
      return new Response(
        JSON.stringify({ error: "Error al obtener creadores" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fechaReporte = new Date();
    const inicioMes = new Date(fechaReporte.getFullYear(), fechaReporte.getMonth(), 1);
    const ultimoDiaMes = new Date(fechaReporte.getFullYear(), fechaReporte.getMonth() + 1, 0);
    const diasRestantes = Math.max(0, Math.ceil((ultimoDiaMes.getTime() - fechaReporte.getTime()) / (1000 * 60 * 60 * 24)));

    const resultados = [];

    for (const creator of creators) {
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

      // Bono extra
      const diasExtra = Math.max(0, diasLiveMes - 22);
      const bonoExtraUsd = diasExtra * 3;

      // Prioridad <90 días
      const esPrioridad300k = diasEnAgencia < 90 && diamLiveMes < 300000;

      // ¿Cerca del objetivo?
      let cercaObjetivo = false;
      if (proximaGrad) {
        cercaObjetivo = faltanDiam <= (proximaGrad.valor * 0.10) || faltanDiam <= 5000;
      }
      if (!cercaObjetivo && proximoHito) {
        cercaObjetivo = faltanDias <= 3 || faltanHoras <= 5;
      }

      // Calcular probabilidad (semáforo)
      let probabilidad = "verde";
      let probabilidadPorcentaje = 0;

      if (proximaGrad) {
        const avance = (diamLiveMes / proximaGrad.valor) * 100;
        const tiempoTranscurrido = ((fechaReporte.getDate() - 1) / ultimoDiaMes.getDate()) * 100;
        
        if (avance >= tiempoTranscurrido * 0.9) {
          probabilidad = "verde";
          probabilidadPorcentaje = 85;
        } else if (avance >= tiempoTranscurrido * 0.6) {
          probabilidad = "amarillo";
          probabilidadPorcentaje = 50;
        } else {
          probabilidad = "rojo";
          probabilidadPorcentaje = 20;
        }
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

      // Guardar bonificación
      const bonificacionData = {
        creator_id: creator.id,
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

      await supabaseClient
        .from('creator_bonificaciones')
        .upsert(bonificacionData, { 
          onConflict: 'creator_id,mes_referencia',
          ignoreDuplicates: false 
        });

      resultados.push({
        creator_id: creator.id,
        nombre: creator.nombre,
        probabilidad,
        probabilidad_porcentaje: probabilidadPorcentaje,
        ...bonificacionData
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: resultados.length,
        resultados
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error en calculate-all-bonificaciones:', error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
