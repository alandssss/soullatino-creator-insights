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

    const systemPrompt = `Eres un asesor experto en TikTok especializado en creadores de contenido latinos. 
Tu trabajo es analizar las métricas de un creador y generar consejos prácticos, específicos y accionables en español.
Los consejos deben ser personalizados según las métricas del creador y siempre diferentes, evitando respuestas genéricas.
Enfócate en: estrategias de crecimiento, optimización de contenido, engagement, monetización con diamantes, y horarios óptimos para transmitir.`;

    const userPrompt = `Analiza las siguientes métricas del creador ${creatorData.nombre}:
- Diamantes: ${creatorData.diamantes || 0}
- Seguidores: ${creatorData.followers || 0}
- Vistas totales: ${creatorData.views || 0}
- Tasa de engagement: ${creatorData.engagement_rate || 0}%
- Días en live: ${creatorData.dias_live || 0}
- Horas en live: ${creatorData.horas_live || 0}
- Categoría: ${creatorData.categoria || 'No especificada'}
- Vistas último mes: ${creatorData.last_month_views || 0}
- Diamantes último mes: ${creatorData.last_month_diamantes || 0}

Genera 3-4 consejos específicos y accionables para mejorar su rendimiento. Cada consejo debe ser diferente y adaptado a sus métricas actuales.`;

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
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
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
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const advice = data.choices[0].message.content;

    return new Response(JSON.stringify({ advice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-creator-advice function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
