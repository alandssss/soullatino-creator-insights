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

    // 2. Calcular métricas y determinar estado
    const hito = creator.hito_diamantes || 50000;
    const diamantes = creator.diamantes || 0;
    const porcentaje = Math.round((diamantes / hito) * 100);
    const faltantes = Math.max(0, hito - diamantes);
    
    let simbolo = '❌';
    if (porcentaje >= 100) simbolo = '✅';
    else if (porcentaje >= 70) simbolo = '➖';

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemainingInMonth = lastDayOfMonth - currentDay;

    // 3. Generar recomendación con formato estricto SIN MARKDOWN
    const systemPrompt = `Eres un asesor de TikTok LIVE. 

ADVERTENCIA CRÍTICA: Si no sigues EXACTAMENTE el formato especificado, tu respuesta será RECHAZADA.

FORMATO OBLIGATORIO (COPIA EXACTAMENTE ESTA ESTRUCTURA - SIN MARKDOWN):

🎯 Tu hito: [número] diamantes este mes

📍 Dónde estás:
- Llevas [número] diamantes ([porcentaje]% del objetivo)
- [✅/➖/❌] [Te faltan X diamantes / Ya superaste tu meta]

💪 Acción de HOY:
[UNA SOLA frase. Máximo 40 palabras]

REGLAS ABSOLUTAS - NO NEGOCIABLES:
1. NO uses markdown (sin **, sin _, sin #)
2. NO escribas párrafos introductorios
3. USA SOLO los 3 bloques con emojis
4. Máximo 100 palabras TOTAL
5. La acción debe tener NÚMEROS concretos

EJEMPLO CORRECTO:
🎯 Tu hito: 100,000 diamantes este mes

📍 Dónde estás:
- Llevas 45,000 diamantes (45% del objetivo)
- ❌ Te faltan 55,000 diamantes

💪 Acción de HOY:
Haz 2 batallas PKO hoy para sumar 15,000 diamantes y llegar al 60% de tu meta.

RESPONDE SOLO CON EL FORMATO. SIN MARKDOWN.`;

    const userPrompt = `CREADOR: ${creator.nombre}
FECHA: Día ${currentDay} de ${lastDayOfMonth} del mes ${currentMonth}
DÍAS RESTANTES: ${daysRemainingInMonth}

DATOS DEL MES ACTUAL (columnas H, I, J, AB):
- Hito asignado: ${hito.toLocaleString()} diamantes
- Diamantes actuales: ${diamantes.toLocaleString()}
- Días en LIVE: ${creator.dias_live || 0}
- Horas en LIVE: ${creator.horas_live || 0}

Genera la retroalimentación en el formato obligatorio.`;

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
      const estado = porcentaje >= 100 ? 'Ya superaste tu meta' : `Te faltan ${faltantes.toLocaleString()} diamantes`;
      
      recommendation = `🎯 Tu hito: ${hito.toLocaleString()} diamantes este mes

📍 Dónde estás:
- Llevas ${diamantes.toLocaleString()} diamantes (${porcentaje}% del objetivo)
- ${simbolo} ${estado}

💪 Acción de HOY:
Haz ${porcentaje < 50 ? '2-3' : '1-2'} batallas PKO hoy y suma ${creator.dias_live || 0 < 15 ? '1 día más' : 'más horas'} de LIVE para acercarte a tu meta.`;
    }

    // 4. Guardar la recomendación en la base de datos
    const tipo = porcentaje >= 100 ? 'completado' : porcentaje >= 70 ? 'cerca' : 'en_progreso';
    const { error: insertError } = await supabase
      .from('creator_recommendations')
      .insert({
        creator_id: creatorId,
        titulo: `Recomendación - ${porcentaje}% del hito`,
        descripcion: recommendation,
        tipo: tipo,
        prioridad: porcentaje < 50 ? 'alta' : porcentaje < 80 ? 'media' : 'baja',
        icono: simbolo
      });

    if (insertError) {
      console.error('Error guardando recomendación:', insertError);
    }

    return new Response(
      JSON.stringify({ 
        recommendation,
        milestone: tipo,
        milestoneDescription: `${porcentaje}% del hito alcanzado`,
        metrics: {
          hito,
          diamantes,
          porcentaje,
          faltantes
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
