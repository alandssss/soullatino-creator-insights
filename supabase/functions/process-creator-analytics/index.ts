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
    const { creatorId } = await req.json();
    
    if (!creatorId) {
      return new Response(
        JSON.stringify({ error: 'creatorId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Obtener información del creador con métricas del mes actual
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('nombre, diamantes, horas_live, dias_live, hito_diamantes')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      console.error('Error obteniendo creador:', creatorError);
      return new Response(
        JSON.stringify({ error: 'Creador no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Calcular fechas y días restantes
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const remaining_calendar_days = Math.max(0, lastDayOfMonth - currentDay + 1);

    // 3. Obtener hitos (por ahora valores por defecto, se pueden parametrizar)
    const target_valid_days = 20;
    const target_hours = 70;
    const target_diamonds = creator.hito_diamantes || 100000;

    // 4. Progreso actual
    const valid_days_so_far = creator.dias_live || 0;
    const hours_so_far = creator.horas_live || 0;
    const diamonds_so_far = creator.diamantes || 0;

    // 5. Calcular necesidades
    const needed_valid_days = Math.max(0, target_valid_days - valid_days_so_far);
    const needed_hours = Math.max(0, target_hours - hours_so_far);
    const needed_diamonds = Math.max(0, target_diamonds - diamonds_so_far);

    // 6. Factibilidad de días
    const dias_factibles = needed_valid_days <= remaining_calendar_days;
    const dias_factibles_texto = dias_factibles 
      ? 'alcanzas' 
      : `ya no dan los días del calendario (faltarán ${needed_valid_days - remaining_calendar_days})`;

    // 7. Horas por día necesarias
    const required_hours_per_day = remaining_calendar_days > 0 
      ? needed_hours / remaining_calendar_days 
      : needed_hours;
    
    let semaforo_horas = 'holgado';
    if (required_hours_per_day > 6) semaforo_horas = 'poco realista';
    else if (required_hours_per_day > 4) semaforo_horas = 'apretado';
    else if (required_hours_per_day > 2) semaforo_horas = 'ajustado';

    // 8. Diamantes por día necesarios
    const required_diamonds_per_day = remaining_calendar_days > 0
      ? Math.round(needed_diamonds / remaining_calendar_days)
      : needed_diamonds;

    // 9. Sugerencias para hoy
    const hoy_horas_sugeridas = Math.ceil(required_hours_per_day);
    const hoy_dias_validos_sugeridos = needed_valid_days > 0 ? 1 : 0;
    const pko_sugeridos_hoy = required_diamonds_per_day > 5000 ? 1 : 0;

    // 10. Generar retroalimentación con formato estricto
    const systemPrompt = `Eres un asesor de TikTok LIVE que genera retroalimentaciones factuales y directas.

FORMATO OBLIGATORIO (máximo 4 oraciones):

1. Estado: "Llevas X/Y días y Z/W h; faltan A días y B h con C días por delante."
2. Factibilidad: "Días: [factible/no factible]. Horas: necesitas ~N h/día ([semáforo])."
3. Diamantes: "Faltan X para Y (≈ Z/día)."
4. Acción de hoy: "Transmite N h, asegura M día(s) válido(s) y agenda K PKO."

REGLAS:
- NO uses markdown
- NO uses saludos ni motivacionales
- SOLO números concretos
- Máximo 4 oraciones
- Si días no factibles: sugerir apuntar al hito inferior

EJEMPLO:
"Llevas 14/20 días y 48/70 h; faltan 6 días y 22 h con 11 días por delante. Días: alcanzas. Horas: necesitas ~2 h/día (ajustado). Faltan 120,000 para 300,000 (≈10,909/día). Transmite 2 h, asegura 1 día válido y agenda 1 PKO."`;

    const userPrompt = `CREADOR: ${creator.nombre}
HOY: día ${currentDay} del mes ${currentMonth}

PROGRESO:
- Días válidos: ${valid_days_so_far}/${target_valid_days}
- Horas: ${hours_so_far.toFixed(1)}/${target_hours}
- Diamantes: ${diamonds_so_far.toLocaleString()}/${target_diamonds.toLocaleString()}

RESTANTE:
- Días calendario: ${remaining_calendar_days}
- Días válidos necesarios: ${needed_valid_days}
- Horas necesarias: ${needed_hours.toFixed(1)}
- Diamantes necesarios: ${needed_diamonds.toLocaleString()}

FACTIBILIDAD:
- Días: ${dias_factibles_texto}
- Horas por día: ${required_hours_per_day.toFixed(1)} (${semaforo_horas})
- Diamantes por día: ${required_diamonds_per_day.toLocaleString()}

SUGERENCIAS HOY:
- Horas: ${hoy_horas_sugeridas}
- Días válidos: ${hoy_dias_validos_sugeridos}
- PKO: ${pko_sugeridos_hoy}

Genera la retro en 4 oraciones exactas según el formato.`;

    let recommendation = '';

    if (lovableApiKey) {
      try {
        const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          recommendation = aiData.choices[0]?.message?.content || '';
        } else {
          console.error('Error en IA gateway:', await aiResponse.text());
        }
      } catch (error) {
        console.error('Error llamando a IA:', error);
      }
    }

    // Fallback si no hay IA o falló
    if (!recommendation) {
      recommendation = `Llevas ${valid_days_so_far}/${target_valid_days} días y ${hours_so_far.toFixed(1)}/${target_hours} h; faltan ${needed_valid_days} días y ${needed_hours.toFixed(1)} h con ${remaining_calendar_days} días por delante. Días: ${dias_factibles_texto}. Horas: necesitas ~${required_hours_per_day.toFixed(1)} h/día (${semaforo_horas}). Faltan ${needed_diamonds.toLocaleString()} para ${target_diamonds.toLocaleString()} (≈${required_diamonds_per_day.toLocaleString()}/día). Transmite ${hoy_horas_sugeridas} h, asegura ${hoy_dias_validos_sugeridos} día(s) válido(s) y agenda ${pko_sugeridos_hoy} PKO.`;
    }

    // 4. Guardar la recomendación en la base de datos
    const tipo = dias_factibles ? (semaforo_horas === 'holgado' ? 'verde' : 'amarillo') : 'rojo';
    const { error: insertError } = await supabase
      .from('creator_recommendations')
      .insert({
        creator_id: creatorId,
        titulo: `Retro ${currentDay}/${currentMonth}`,
        descripcion: recommendation,
        tipo: tipo,
        prioridad: tipo === 'rojo' ? 'alta' : tipo === 'amarillo' ? 'media' : 'baja',
        icono: tipo === 'verde' ? '✅' : tipo === 'amarillo' ? '⚠️' : '🔴'
      });

    if (insertError) {
      console.error('Error guardando recomendación:', insertError);
    }

    return new Response(
      JSON.stringify({ 
        recommendation,
        milestone: tipo,
        milestoneDescription: `${dias_factibles ? 'Factible' : 'Difícil'} - ${semaforo_horas}`,
        metrics: {
          valid_days_so_far,
          target_valid_days,
          needed_valid_days,
          hours_so_far,
          target_hours,
          needed_hours,
          required_hours_per_day: required_hours_per_day.toFixed(1),
          diamonds_so_far,
          target_diamonds,
          needed_diamonds,
          required_diamonds_per_day,
          remaining_calendar_days
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error en process-creator-analytics:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
