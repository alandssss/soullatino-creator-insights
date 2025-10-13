import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('SUPABASE_URL') || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Extract and verify JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado. Token requerido.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create authenticated client to check user role
    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has admin or manager role
    console.log('Verificando rol del usuario:', user.id);
    const { data: userRole, error: roleError } = await supabaseAuth
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    console.log('Rol obtenido:', userRole, 'Error:', roleError);

    if (roleError || !userRole || (userRole.role !== 'admin' && userRole.role !== 'manager')) {
      console.error('Usuario sin permisos:', user.id, userRole);
      return new Response(
        JSON.stringify({ error: 'No autorizado. Se requiere rol de admin o manager.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usuario autorizado con rol:', userRole.role);

    // User is authorized, proceed with the request
    const { creatorId } = await req.json();
    console.log('Procesando creatorId:', creatorId);
    
    if (!creatorId) {
      console.error('creatorId no proporcionado');
      return new Response(
        JSON.stringify({ error: 'creatorId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    // Use service role client for admin operations (after authorization check)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // 9. Sugerencias para hoy (PKO siempre obligatorio)
    const hoy_horas_sugeridas = Math.max(1, Math.ceil(required_hours_per_day));
    const hoy_dias_validos_sugeridos = needed_valid_days > 0 ? 1 : 0;
    
    // Calcular PKO según el estado
    let pko_sugeridos_hoy = 10; // Por defecto encaminado
    if (valid_days_so_far < 5 || hours_so_far < 15) {
      pko_sugeridos_hoy = 5; // Empezando
    } else if (diamonds_so_far < target_diamonds * 0.3) {
      pko_sugeridos_hoy = 20; // Bajo en diamantes
    }

    // 10. Generar retroalimentación con formato de 4 líneas
    const systemPrompt = `Eres un asesor de TikTok LIVE que genera retroalimentaciones cortas y accionables.

REGLAS ESTRICTAS:
1. Diamantes = graduaciones (50K, 100K, 300K, 500K, 1M)
2. Horas y días = hitos (Hito 1: 12d+40h, Hito 3: 20d+60h, Hito 4: 22d+80h)
3. SIEMPRE incluir PKO (nunca 0)
4. Máximo 4 líneas
5. Sin tecnicismos, sin porcentajes visibles, sin markdown
6. Lenguaje simple y directo

FORMATO OBLIGATORIO (4 líneas):

LÍNEA 1 - Estado actual en palabras simples:
Ejemplo: "Apenas llevas X días y Y horas, pero todavía alcanzas el hito."

LÍNEA 2 - Qué debe hacer hoy:
Ejemplo: "Hoy transmite Z horas y marca este día como válido."

LÍNEA 3 - Diamantes:
Ejemplo: "Te faltan N diamantes para tu graduación, todavía es alcanzable."

LÍNEA 4 - PKO obligatorio:
Ejemplo: "Incluye al menos 5 PKO de 5 minutos hoy para avanzar en diamantes."

EJEMPLO COMPLETO:
"Llevas poco avance pero aún estás a tiempo. Hoy transmite 3 horas y asegúrate de contar este día como válido. Te faltan pocos diamantes para tu meta. Haz mínimo 10 PKO de 5 minutos hoy para no atrasarte."

NUNCA uses markdown, nunca digas "0 PKO", siempre da un número de PKO.`;

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
      const estado = valid_days_so_far < target_valid_days * 0.5 
        ? 'Llevas poco avance pero aún estás a tiempo'
        : dias_factibles 
          ? 'Vas bien encaminado y todavía alcanzas tu hito'
          : 'El tiempo se agota pero aún puedes ajustar tu meta';
      
      const diamantes_texto = needed_diamonds > target_diamonds * 0.7
        ? 'te faltan muchos diamantes para tu graduación'
        : needed_diamonds > 0
          ? 'te faltan pocos diamantes para tu meta'
          : 'ya alcanzaste tu graduación de diamantes';
      
      recommendation = `${estado}. Hoy transmite ${hoy_horas_sugeridas} horas y asegúrate de contar este día como válido. ${diamantes_texto.charAt(0).toUpperCase() + diamantes_texto.slice(1)}. Haz mínimo ${pko_sugeridos_hoy} PKO de 5 minutos hoy para ${needed_diamonds > 0 ? 'no atrasarte' : 'mantener el ritmo'}.`;
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
    // Log detailed error server-side only (for debugging)
    console.error('Error in process-creator-analytics:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    
    // Return generic error to client (prevents information disclosure)
    return new Response(
      JSON.stringify({ error: 'Unable to process analytics' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
