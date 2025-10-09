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

    // 1. Obtener el snapshot más reciente del creador
    const { data: latestSnapshot, error: snapshotError } = await supabase
      .from('creator_daily_stats')
      .select('*')
      .eq('creator_id', creatorId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapshotError) {
      console.error('Error obteniendo snapshot:', snapshotError);
      return new Response(
        JSON.stringify({ error: 'Error obteniendo datos del creador' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!latestSnapshot) {
      return new Response(
        JSON.stringify({ error: 'No hay datos históricos para este creador' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Obtener información del creador
    const { data: creator, error: creatorError } = await supabase
      .from('creators')
      .select('nombre, graduacion, categoria, manager')
      .eq('id', creatorId)
      .single();

    if (creatorError || !creator) {
      console.error('Error obteniendo creador:', creatorError);
      return new Response(
        JSON.stringify({ error: 'Creador no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Determinar el hito actual basado en días y horas
    const days = latestSnapshot.days_since_joining || 0;
    const hours = latestSnapshot.live_duration_l30d || 0;
    const diamonds = latestSnapshot.diamonds_l30d || 0;

    let milestone = 'inicio';
    let milestoneDescription = '';
    
    if (days >= 22 && hours >= 80) {
      milestone = 'avanzado';
      milestoneDescription = '22+ días, 80+ horas live';
    } else if (days >= 20 && hours >= 60) {
      milestone = 'intermedio';
      milestoneDescription = '20+ días, 60+ horas live';
    } else if (days >= 12 && hours >= 40) {
      milestone = 'inicial';
      milestoneDescription = '12+ días, 40+ horas live';
    } else {
      milestone = 'principiante';
      milestoneDescription = `${days} días, ${hours.toFixed(1)} horas live`;
    }

    // 4. Generar recomendación personalizada con IA
    const systemPrompt = `Eres un experto en gestión de creadores de TikTok Live. Tu objetivo es proporcionar consejos específicos, accionables y motivadores.

CONTEXTO DEL CREADOR:
- Nombre: ${creator.nombre}
- Categoría: ${creator.categoria || 'No especificada'}
- Graduación: ${creator.graduacion || 'No especificada'}
- Manager: ${creator.manager || 'No asignado'}

MÉTRICAS ACTUALES:
- Días desde inicio: ${days}
- Horas live (últimos 30 días): ${hours.toFixed(1)}
- Diamantes (últimos 30 días): ${diamonds.toLocaleString()}
- Seguidores: ${latestSnapshot.followers || 0}
- Engagement: ${latestSnapshot.engagement_rate || 0}%
- Ingreso estimado: $${latestSnapshot.ingreso_estimado || 0}

HITO ACTUAL: ${milestone} (${milestoneDescription})

INSTRUCCIONES:
1. Genera un consejo específico de 2-3 oraciones
2. Enfócate en acciones concretas que el creador puede hacer HOY
3. Sé positivo pero realista
4. Menciona el hito actual si es relevante
5. Si está por debajo de las expectativas, motiva sin criticar`;

    const userPrompt = `Genera un consejo personalizado para ${creator.nombre} basado en su hito actual: ${milestone}.`;

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
      const fallbacks: Record<string, string> = {
        'principiante': `¡Bienvenido/a ${creator.nombre}! Estás en tus primeros pasos. Enfócate en crear una rutina de transmisiones consistente. Objetivo: alcanzar 12 días y 40 horas de live en los próximos 30 días. Tu progreso actual: ${days} días, ${hours.toFixed(1)} horas.`,
        'inicial': `¡Excelente ${creator.nombre}! Has alcanzado el primer hito (12d/40h). Ahora enfócate en aumentar la interacción con tu audiencia. Responde todos los comentarios y crea dinámicas participativas. Próximo objetivo: 20 días, 60 horas.`,
        'intermedio': `¡Vas muy bien ${creator.nombre}! Estás en el hito intermedio (20d/60h). Es momento de monetizar mejor: pide regalos de forma estratégica y promociona eventos especiales. Objetivo: 22 días, 80 horas.`,
        'avanzado': `¡Eres un creador consolidado ${creator.nombre}! Con ${days} días y ${hours.toFixed(1)} horas, estás en la élite. Enfócate en diversificar contenido y crear colaboraciones con otros creadores top.`
      };
      recommendation = fallbacks[milestone] || fallbacks['principiante'];
    }

    // 5. Guardar la recomendación en la base de datos
    const { error: insertError } = await supabase
      .from('creator_recommendations')
      .insert({
        creator_id: creatorId,
        titulo: `Recomendación ${milestone.charAt(0).toUpperCase() + milestone.slice(1)}`,
        descripcion: recommendation,
        tipo: milestone,
        prioridad: days < 12 ? 'alta' : days < 20 ? 'media' : 'baja',
        icono: milestone === 'avanzado' ? '🏆' : milestone === 'intermedio' ? '📈' : milestone === 'inicial' ? '🎯' : '🌱'
      });

    if (insertError) {
      console.error('Error guardando recomendación:', insertError);
    }

    return new Response(
      JSON.stringify({ 
        recommendation,
        milestone,
        milestoneDescription,
        metrics: {
          days,
          hours: hours.toFixed(1),
          diamonds
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
