import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuickLogRequest {
  creator_id: string;
  flags: {
    en_vivo?: boolean;
    en_batalla?: boolean;
    buena_iluminacion?: boolean;
    cumple_normas?: boolean;
    audio_claro?: boolean;
    set_profesional?: boolean;
  };
  reporte?: string;
  severidad?: 'baja' | 'media' | 'alta';
  accion_sugerida?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verificar autenticación
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar rol (admin, manager o supervisor)
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!roleData || !['admin', 'manager', 'supervisor'].includes(roleData.role)) {
      console.error('Insufficient permissions:', roleData?.role);
      return new Response(
        JSON.stringify({ error: 'Forbidden: requires admin, manager or supervisor role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: máximo 1 log por creador cada 60s
    const body: QuickLogRequest = await req.json();
    const { creator_id, flags, reporte, severidad, accion_sugerida } = body;

    if (!creator_id) {
      throw new Error('creator_id is required');
    }

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const { data: recentLogs } = await supabase
      .from('supervision_live_logs')
      .select('id')
      .eq('creator_id', creator_id)
      .eq('observer_user_id', user.id)
      .gte('created_at', oneMinuteAgo)
      .limit(1);

    if (recentLogs && recentLogs.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Rate limit: wait 60 seconds before logging again for this creator' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener nombre del observer
    const observerName = user.email || user.user_metadata?.name || 'Supervisor';

    // Insertar log
    const { data: newLog, error: insertError } = await supabase
      .from('supervision_live_logs')
      .insert({
        creator_id,
        observer_user_id: user.id,
        observer_name: observerName,
        fecha_evento: new Date().toISOString(),
        en_vivo: flags.en_vivo || false,
        en_batalla: flags.en_batalla || false,
        buena_iluminacion: flags.buena_iluminacion || false,
        cumple_normas: flags.cumple_normas !== undefined ? flags.cumple_normas : true,
        audio_claro: flags.audio_claro || false,
        set_profesional: flags.set_profesional || false,
        reporte: reporte || null,
        severidad: severidad || null,
        accion_sugerida: accion_sugerida || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    console.log('Quick log created:', newLog.id);

    return new Response(
      JSON.stringify({ success: true, log: newLog }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error: any) {
    // Log detailed error server-side only (for debugging)
    console.error('Error in supervision-quicklog:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Return generic error to client (prevents information disclosure)
    return new Response(
      JSON.stringify({ error: 'Unable to process supervision log' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});