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

🎯 TU MISIÓN: Motivar al creador a alcanzar el siguiente HITO MENSUAL basándote ÚNICAMENTE en su progreso del mes actual.

📊 HITOS MENSUALES (Son metas OBLIGATORIAS para crecer):
- **Nivel 1**: 12 días transmitiendo + 40 horas en LIVE
- **Nivel 2**: 20 días transmitiendo + 60 horas en LIVE  
- **Nivel 3**: 22 días transmitiendo + 80 horas en LIVE

💡 ¿POR QUÉ SON IMPORTANTES LOS HITOS?
- Aseguran consistencia y crecimiento sostenido
- Mejoran el algoritmo de TikTok a tu favor
- Aumentan tus ingresos mes a mes
- Te mantienen comprometido con tu audiencia

📋 INSTRUCCIONES DE ANÁLISIS:

1. **Identifica el siguiente hito alcanzable**
   - Revisa cuántos días y horas lleva el creador
   - Determina cuál es el siguiente nivel que puede alcanzar
   - Si ya superó un nivel, felicítalo brevemente y enfócate en el siguiente

2. **Calcula exactamente qué necesita**
   - Días que le faltan para el hito
   - Horas que le faltan para el hito
   - Días restantes del mes actual
   - Ritmo diario necesario (horas/día promedio)

3. **Da un consejo ESPECÍFICO y MOTIVADOR**
   - Usa los números exactos calculados
   - Sé directo sobre lo que debe hacer HOY
   - Menciona el impacto positivo de alcanzar el hito
   - Si las Batallas PKO están bajas (<5), menciónalas como motor de diamantes

📝 FORMATO DE RESPUESTA (Mantén tu respuesta CORTA, máximo 150 palabras):

**🎯 Objetivo: [Nombre del Hito]**
[Ejemplo: "Nivel 2 (20 días + 60 horas)"]

**📍 Dónde estás:**
[Ejemplo: "Llevas 15 días y 45 horas este mes"]

**⚡ Qué necesitas:**
[Ejemplo: "Te faltan 5 días más y 15 horas. Con 10 días restantes del mes, necesitas transmitir 1.5 horas diarias y activarte 5 días más"]

**💪 Acción inmediata:**
[Consejo específico y motivador con datos. Ejemplo: "¡Estás muy cerca! Transmite hoy mismo y mantén 1.5 horas diarias. Si aumentas tus Batallas PKO (tienes solo 3), subirán tus diamantes. Alcanzar el Nivel 2 aumentará tus ingresos significativamente"]

REGLAS CRÍTICAS:
- SÉ ULTRA ESPECÍFICO con números (días exactos, horas exactas, ritmo diario)
- ENFÓCATE en lo que falta para el SIGUIENTE hito alcanzable
- Si ya superó todos los hitos, felicítalo y motívalo a mantener el nivel
- SIEMPRE menciona el beneficio de alcanzar el hito
- Máximo 150 palabras en total`;

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
