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

    const systemPrompt = `Eres un asesor experto en TikTok LIVE especializado en creadores de contenido latinos. 
Tu trabajo es analizar las métricas de un creador y generar consejos prácticos, específicos y accionables en español.

IMPORTANTE: Las batallas PKO (Player Knock-Out) en TikTok LIVE son el MOTOR PRINCIPAL de monetización. 
Los diamantes, horas en live y días activos aumentan proporcionalmente a más batallas PKO realizadas:
- Más tiempo en live = más oportunidades de batallas
- Más batallas = más diamantes ganados
- Más días activos = más consistencia en batallas

Los consejos deben enfocarse en:
1. Estrategias para aumentar las batallas PKO (matches)
2. Optimización de horarios para maximizar batallas
3. Técnicas para ganar más batallas y aumentar diamantes
4. Consistencia y frecuencia de transmisiones en vivo
5. Engagement con la audiencia durante batallas

Genera consejos personalizados según las métricas del creador y siempre diferentes, evitando respuestas genéricas.`;

    const userPrompt = `Analiza las siguientes métricas del creador ${creatorData.nombre}:
- Diamantes: ${creatorData.diamantes || 0}
- Seguidores: ${creatorData.followers || 0}
- Vistas totales: ${creatorData.views || 0}
- Matches/Batallas PKO: ${creatorData.engagement_rate || 0}
- Días en live: ${creatorData.dias_live || 0}
- Horas en live: ${creatorData.horas_live || 0}
- Categoría: ${creatorData.categoria || 'No especificada'}
- Vistas último mes: ${creatorData.last_month_views || 0}
- Diamantes último mes: ${creatorData.last_month_diamantes || 0}

RECUERDA: Las batallas PKO son la métrica más importante. Más batallas = más horas live = más diamantes.
Genera 3-4 consejos específicos y accionables para maximizar sus batallas PKO y mejorar su monetización.`;

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
