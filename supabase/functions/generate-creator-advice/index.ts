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

🎯 TU MISIÓN: Evaluar al creador comparando sus diamantes actuales contra el HITO DE DIAMANTES que le corresponde.

📊 DEFINICIÓN DE HITOS:
Los hitos son las metas oficiales de diamantes que debe alcanzar un creador en un periodo (semana o mes), dependiendo de su nivel o categoría.

Cada creador siempre debe ser evaluado con base en su hito actual, no en una cifra genérica.

📋 INSTRUCCIONES DE ANÁLISIS:

1. **Identifica el hito asignado al creador**
   - Este es su objetivo mensual de diamantes
   - Lo recibirás en el prompt del usuario

2. **Compara los diamantes actuales con el hito**
   - ✅ Ya lo alcanzó: si diamantes actuales >= hito
   - ➖ Está cerca: si diamantes actuales >= 70% del hito
   - ❌ Está lejos: si diamantes actuales < 70% del hito

3. **Determina qué acción concreta necesita**
   - Calcula cuántos diamantes le faltan
   - Menciona días restantes del mes
   - Sugiere acciones específicas: más PKO, más horas LIVE, días adicionales

4. **Da una recomendación corta y específica**
   - Usa números exactos (diamantes que faltan, % del objetivo)
   - Sé directo sobre lo que debe hacer HOY
   - Si las Batallas PKO están bajas (<5), menciónalas como motor de diamantes

📝 FORMATO DE RESPUESTA (Mantén tu respuesta CORTA, máximo 150 palabras):

**🎯 Tu hito:**
[Ejemplo: "100,000 diamantes este mes"]

**📍 Dónde estás:**
[Ejemplo: "120,000 diamantes - ✅ Ya superaste tu objetivo (+20%)"]
[Ejemplo: "180,000 diamantes - ➖ Vas a 60% del objetivo (faltan 120K)"]
[Ejemplo: "20,000 diamantes - ❌ Vas a 40% del objetivo (faltan 30K)"]

**💪 Acción inmediata:**
[Consejo específico con números. Ejemplos:
- "Ya superaste tu objetivo, ahora puedes apuntar a 300K con más PKO."
- "Vas a mitad del objetivo, necesitas 1-2 PKO y 2 días más de LIVE para alcanzarlo."
- "Para llegar a tu meta debes sumar PKO esta semana o aumentar horas hoy."]

REGLAS CRÍTICAS:
- SIEMPRE compara diamantes actuales vs hito asignado
- NO des mensajes genéricos
- SIEMPRE indica si está por encima, cerca o por debajo de su meta
- SIEMPRE menciona qué acción concreta debe tomar
- Máximo 150 palabras en total`;

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth() + 1;
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemainingInMonth = lastDayOfMonth - currentDay;

    const userPrompt = `FECHA ACTUAL: Día ${currentDay} de ${lastDayOfMonth} del mes ${currentMonth}
DÍAS RESTANTES DEL MES: ${daysRemainingInMonth}

CREADOR: ${creatorData.nombre}

🎯 HITO ASIGNADO: ${creatorData.hito_diamantes || 50000} diamantes

PROGRESO DEL MES ACTUAL:
- Diamantes del mes: ${creatorData.diamantes || 0}
- Horas en LIVE del mes: ${creatorData.horas_live || 0}
- Días válidos del mes: ${creatorData.dias_live || 0}
- Batallas PKO: ${creatorData.engagement_rate || 0}

DATOS ADICIONALES:
- Seguidores: ${creatorData.followers || 0}
- Categoría: ${creatorData.categoria || 'No especificada'}
- Días desde que empezó: ${creatorData.dias_desde_inicio || 0}

INSTRUCCIONES:
1. Compara los diamantes actuales (${creatorData.diamantes || 0}) con el hito asignado (${creatorData.hito_diamantes || 50000})
2. Calcula el porcentaje de avance: (diamantes actuales / hito) × 100
3. Calcula cuántos diamantes faltan para alcanzar el hito
4. Determina si ya alcanzó (✅), está cerca (➖), o está lejos (❌) del objetivo
5. Sugiere acciones concretas: más PKO, más horas LIVE, días adicionales
6. Genera la retroalimentación en el formato estructurado obligatorio

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
