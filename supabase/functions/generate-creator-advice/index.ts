import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { creatorData } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Eres un asesor experto en TikTok LIVE especializado en agencias de talento latino. 
Tu trabajo es generar retroalimentación personalizada basándote en el PROGRESO DEL MES ACTUAL.

📊 INDICADORES CLAVE DEL MES:
1. **Diamantes del mes** - Monetización actual
2. **Horas en LIVE del mes** - Tiempo de transmisión acumulado
3. **Días válidos del mes** - Días que ha transmitido
4. **Batallas PKO del mes** - Participación en batallas (motor de monetización)

🎯 HITOS MENSUALES (Requisitos para alcanzar cada nivel):
- **Nivel 1**: 12 días + 40 horas
- **Nivel 2**: 20 días + 60 horas  
- **Nivel 3**: 22 días + 80 horas

📋 PROCESO DE ANÁLISIS:

1. **Calcular días restantes del mes**
   - Determinar qué día del mes es hoy
   - Calcular cuántos días quedan hasta fin de mes
   
2. **Evaluar progreso vs hito más cercano**
   - Identificar en qué nivel está o cuál es el siguiente hito a alcanzar
   - Calcular cuántos días y horas le faltan para el siguiente nivel
   - Determinar si es alcanzable en los días restantes del mes
   
3. **Analizar ritmo requerido**
   - Si falta X días para el hito y quedan Y días de mes
   - Calcular: "necesitas transmitir X horas/día en promedio"
   - Ejemplo: Si necesita 15 horas más y quedan 10 días → "necesitas 1.5 horas diarias"

4. **Detectar patrones críticos**:
   - Si tiene buenos diamantes pero pocas horas → "Estás monetizando bien, aumenta tus horas para alcanzar el hito"
   - Si tiene muchas horas pero pocos diamantes → "Aumenta tu participación en batallas PKO"
   - Si no hace batallas PKO → "Las batallas PKO son críticas para generar diamantes"
   - Si días válidos bajos → "Necesitas más días activos para el hito"

📝 FORMATO DE RESPUESTA OBLIGATORIO:

**1. Estado General:**
[Resumen: "Estás en X días / Y horas este mes. Para alcanzar [Hito], te faltan Z días y W horas."]

**2. Días Restantes:**
[Cuántos días quedan del mes y si el hito es alcanzable]

**3. Ritmo Recomendado:**
[Acción específica: "Necesitas transmitir X horas diarias y X días más este mes para alcanzar [Hito]"]

**4. Punto Fuerte / Área de Mejora:**
[Lo que hace bien y qué debe ajustar - específico con datos]

IMPORTANTE: 
- Siempre calcular con base al día actual del mes
- Ser realista sobre alcanzabilidad del hito
- Si ya superó un hito, felicitar y orientar al siguiente
- Mencionar batallas PKO si están bajas (son el motor de diamantes)`;

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemainingInMonth = lastDayOfMonth - currentDay;

    const userPrompt = `FECHA ACTUAL: Día ${currentDay} de ${lastDayOfMonth} del mes ${currentMonth}
DÍAS RESTANTES DEL MES: ${daysRemainingInMonth}

CREADOR: ${creatorData.nombre}

PROGRESO DEL MES ACTUAL:
- Diamantes del mes: ${creatorData.diamantes || 0}
- Horas en LIVE del mes: ${creatorData.horas_live || 0}
- Días válidos del mes: ${creatorData.dias_live || 0}
- Batallas PKO: ${creatorData.engagement_rate || 0}

DATOS ADICIONALES:
- Seguidores: ${creatorData.followers || 0}
- Categoría: ${creatorData.categoria || 'No especificada'}
- Días desde que empezó: ${creatorData.dias_desde_inicio || 0}

HITOS A EVALUAR:
- Nivel 1: 12 días + 40 horas
- Nivel 2: 20 días + 60 horas
- Nivel 3: 22 días + 80 horas

INSTRUCCIONES:
1. Calcula cuántos días y horas le faltan para el siguiente hito alcanzable
2. Determina el ritmo diario necesario (horas/día) para los días restantes del mes
3. Evalúa si el hito es alcanzable este mes
4. Genera la retroalimentación en el formato estructurado obligatorio

Sé específico con números, realista y motivador.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      console.error("[Server] AI gateway error:", response.status);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to generate advice" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const advice = data.choices[0].message.content;

    return new Response(JSON.stringify({ advice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Server] Error in generate-creator-advice:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
