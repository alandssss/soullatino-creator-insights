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
    console.log('[register-contact] Starting...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { creator_id, creator_username, phone_e164, channel } = await req.json();

    if (!creator_id || !channel) {
      throw new Error('Missing required fields: creator_id, channel');
    }

    // Obtener user agent e IP
    const userAgent = req.headers.get('user-agent') || 'Unknown';
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'Unknown';

    // Registrar contacto
    const { data: logData, error: logError } = await supabase
      .from('creator_contact_log')
      .insert({
        creator_id,
        creator_username,
        phone_e164,
        channel,
        action: 'Click',
        user_agent: userAgent,
        ip,
      })
      .select()
      .single();

    if (logError) {
      throw logError;
    }

    console.log('[register-contact] Contact registered:', logData.id);

    // Si es WhatsApp, intentar enviar mensaje (usando la función existente whatsapp_activity)
    if (channel === 'WhatsApp' && phone_e164) {
      try {
        // Registrar en whatsapp_activity también
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email || 'System';

        await supabase.from('whatsapp_activity').insert({
          creator_id,
          user_email: userEmail,
          action_type: 'seguimiento',
          message_preview: 'Mensaje de alerta automática',
          creator_name: creator_username || '',
        });

        // Actualizar el log con MessageSent
        await supabase
          .from('creator_contact_log')
          .update({ action: 'MessageSent' })
          .eq('id', logData.id);

        console.log('[register-contact] WhatsApp activity registered');
      } catch (waError) {
        console.error('[register-contact] WhatsApp error:', waError);
        const waErrorMessage = waError instanceof Error ? waError.message : 'Unknown WhatsApp error';
        // Actualizar el log con Failed
        await supabase
          .from('creator_contact_log')
          .update({ action: 'Failed', notes: waErrorMessage })
          .eq('id', logData.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        record_id: logData.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[register-contact] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
