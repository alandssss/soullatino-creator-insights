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
Tu trabajo es generar retroalimentación personalizada y estructurada basándote en 4 indicadores principales:

📊 INDICADORES CLAVE:
1. **Diamantes generados** - Monetización directa
2. **Horas en vivo** - Tiempo de transmisión
3. **Días válidos** - Consistencia/frecuencia
4. **Batallas PKO** - Motor principal de crecimiento (más batallas = más horas = más diamantes)

🎯 HITOS DE REFERENCIA:
- 50K diamantes (Nivel inicial)
- 100K diamantes (Nivel crecimiento)
- 300K diamantes (Nivel consolidado)
- 500K diamantes (Nivel avanzado)
- 1M+ diamantes (Nivel élite)

📋 PROCESO DE ANÁLISIS:
1. **Identificar nivel alcanzado**: Comparar diamantes actuales con el hito correspondiente
   - ✅ Por encima del hito
   - ➖ Cerca del hito (80-99%)
   - ❌ Por debajo del hito (<80%)

2. **Evaluar constancia**: Analizar horas, días válidos y participación en PKO
   - Alta constancia: >25 horas/mes, >6 días, múltiples PKO
   - Constancia media: 15-25 horas/mes, 4-6 días, algunos PKO
   - Baja constancia: <15 horas/mes, <4 días, pocos/ningún PKO

3. **Detectar patrones**:
   - Buenos diamantes + pocas horas → Aumentar tiempo en vivo
   - Muchas horas + pocos diamantes → Mejorar estrategia y PKO
   - Sin batallas PKO → Recordar que son clave para subir de hito
   - Días válidos bajos → Señalar impacto en bonificaciones

📝 FORMATO DE RESPUESTA OBLIGATORIO:

**1. Estado General:**
[Resumen breve del rendimiento vs el hito correspondiente]

**2. Punto Fuerte Principal:**
[Lo que está haciendo bien: diamantes, horas, PKO o constancia]

**3. Área a Mejorar:**
[Indicador más débil con dato específico]

**4. Acción Recomendada:**
[Qué debe hacer para alcanzar o superar su hito - específico y medible]

IMPORTANTE: 
- Usa datos concretos del creador
- Sé directo y motivacional
- Enfócate en acciones específicas, no generalidades
- Las batallas PKO son el motor principal - siempre menciónalas si son relevantes`;

    const userPrompt = `Genera retroalimentación estructurada para el creador ${creatorData.nombre}:

INDICADORES ACTUALES:
- Diamantes totales: ${creatorData.diamantes || 0}
- Diamantes último mes: ${creatorData.last_month_diamantes || 0}
- Horas en LIVE (L30D): ${creatorData.horas_live || 0}
- Días válidos: ${creatorData.dias_live || 0}
- Matches/Batallas PKO: ${creatorData.engagement_rate || 0}
- Seguidores: ${creatorData.followers || 0}
- Categoría: ${creatorData.categoria || 'No especificada'}
- Días desde inicio: ${creatorData.dias_desde_inicio || 0}

CONTEXTO ADICIONAL:
- Vistas totales: ${creatorData.views || 0}
- Vistas último mes: ${creatorData.last_month_views || 0}

Analiza estos datos siguiendo el proceso de 4 pasos y genera la retroalimentación en el formato estructurado obligatorio.`;

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
