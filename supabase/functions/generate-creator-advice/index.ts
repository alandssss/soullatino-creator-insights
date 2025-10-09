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

    const systemPrompt = `Eres un asesor de TikTok LIVE. Tu trabajo es comparar los diamantes actuales del creador con su HITO asignado y dar UN SOLO consejo específico.

FORMATO OBLIGATORIO (NO LO CAMBIES):

🎯 **Tu hito:** [número] diamantes este mes

📍 **Dónde estás:**
- Llevas [número] diamantes ([porcentaje]% del objetivo)
- [✅/➖/❌] [Te faltan X diamantes / Ya superaste tu meta]

💪 **Acción de HOY:**
[UNA SOLA frase con acción concreta y números. Máximo 40 palabras]

REGLAS ESTRICTAS:
1. USA EXACTAMENTE el formato de arriba (con los emojis)
2. Máximo 100 palabras EN TOTAL
3. La "Acción de HOY" debe ser UNA SOLA cosa específica que puede hacer hoy
4. Usa números exactos (no aproximaciones)
5. Símbolos: ✅ si ya alcanzó, ➖ si está cerca (>70%), ❌ si está lejos (<70%)

Ejemplo de respuesta CORRECTA:
🎯 **Tu hito:** 100,000 diamantes este mes

📍 **Dónde estás:**
- Llevas 45,000 diamantes (45% del objetivo)
- ❌ Te faltan 55,000 diamantes

💪 **Acción de HOY:**
Haz 2 batallas PKO hoy para sumar ~15K diamantes y acercarte al 60% de tu meta.`;

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
- Días en LIVE del mes: ${creatorData.dias_live || 0}
- Horas en LIVE del mes: ${creatorData.horas_live || 0}

INSTRUCCIONES:
1. Compara los diamantes actuales (${creatorData.diamantes || 0}) con el hito asignado (${creatorData.hito_diamantes || 50000})
2. Calcula el porcentaje de avance: (diamantes actuales / hito) × 100
3. Calcula cuántos diamantes faltan para alcanzar el hito
4. Determina si ya alcanzó (✅), está cerca (➖), o está lejos (❌) del objetivo
5. Sugiere acciones concretas basadas en días y horas en LIVE
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
