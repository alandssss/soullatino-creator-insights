import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature',
};

interface TwilioWebhookBody {
  MessageSid: string;
  MessageStatus: string;
  From: string;
  To: string;
  AccountSid: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>,
  authToken: string
): boolean {
  try {
    // Construir el string de datos como lo hace Twilio
    const data = url + Object.keys(params).sort().map(
      key => `${key}${params[key]}`
    ).join('');
    
    // Calcular HMAC-SHA1
    const hmac = createHmac('sha1', authToken);
    const expected = hmac.update(data, 'utf-8').digest('base64');
    
    return signature === expected;
  } catch (error) {
    console.error('Error validating Twilio signature:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔔 Webhook recibido de Twilio');

    // Obtener secretos de Twilio
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (!twilioAuthToken) {
      console.error('❌ TWILIO_AUTH_TOKEN no configurado');
      return new Response('Server configuration error', { status: 500, headers: corsHeaders });
    }

    // Validar firma de Twilio (CRÍTICO DE SEGURIDAD)
    const twilioSignature = req.headers.get('X-Twilio-Signature');
    if (!twilioSignature) {
      console.error('❌ Falta X-Twilio-Signature header');
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    // Parsear el body como form-urlencoded
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString();
    }

    // Validar firma
    const url = req.url;
    const isValid = validateTwilioSignature(twilioSignature, url, params, twilioAuthToken);
    
    if (!isValid) {
      console.error('❌ Firma de Twilio inválida');
      return new Response('Invalid signature', { status: 401, headers: corsHeaders });
    }

    console.log('✅ Firma de Twilio validada');

    // Extraer datos del webhook
    const webhookData: TwilioWebhookBody = {
      MessageSid: params.MessageSid || params.SmsSid,
      MessageStatus: params.MessageStatus || params.SmsStatus,
      From: params.From,
      To: params.To,
      AccountSid: params.AccountSid,
      ErrorCode: params.ErrorCode,
      ErrorMessage: params.ErrorMessage,
    };

    console.log('📩 Webhook data:', {
      MessageSid: webhookData.MessageSid,
      Status: webhookData.MessageStatus,
      ErrorCode: webhookData.ErrorCode,
    });

    if (!webhookData.MessageSid || !webhookData.MessageStatus) {
      console.error('❌ Datos incompletos en webhook');
      return new Response('Missing required fields', { status: 400, headers: corsHeaders });
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar el registro en logs_whatsapp por MessageSid
    const { data: logEntry, error: fetchError } = await supabase
      .from('logs_whatsapp')
      .select('*')
      .eq('twilio_message_sid', webhookData.MessageSid)
      .single();

    if (fetchError) {
      console.error('❌ Error buscando log:', fetchError);
      // No fallar si no se encuentra - puede ser un mensaje no rastreado
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    if (!logEntry) {
      console.warn('⚠️ No se encontró log para MessageSid:', webhookData.MessageSid);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    console.log('📝 Log encontrado, actualizando estado...');

    // Preparar el objeto de actualización de estado
    const statusUpdate = {
      timestamp: new Date().toISOString(),
      status: webhookData.MessageStatus,
      error_code: webhookData.ErrorCode,
      error_message: webhookData.ErrorMessage,
    };

    // Obtener historial actual y agregar nueva entrada
    const currentUpdates = logEntry.status_updates || [];
    const newUpdates = [...currentUpdates, statusUpdate];

    // Preparar campos para actualizar
    const updateFields: any = {
      ultimo_estado: webhookData.MessageStatus,
      ultima_actualizacion: new Date().toISOString(),
      status_updates: newUpdates,
      delivery_status: webhookData.MessageStatus,
    };

    // Actualizar timestamps específicos según el estado
    if (webhookData.MessageStatus === 'delivered') {
      updateFields.delivered_at = new Date().toISOString();
    } else if (webhookData.MessageStatus === 'read') {
      updateFields.read_at = new Date().toISOString();
    } else if (webhookData.MessageStatus === 'failed' || webhookData.MessageStatus === 'undelivered') {
      updateFields.failed_at = new Date().toISOString();
      updateFields.error_code = webhookData.ErrorCode;
      updateFields.error_message = webhookData.ErrorMessage;
    }

    // Actualizar el registro
    const { error: updateError } = await supabase
      .from('logs_whatsapp')
      .update(updateFields)
      .eq('id', logEntry.id);

    if (updateError) {
      console.error('❌ Error actualizando log:', updateError);
      throw updateError;
    }

    console.log('✅ Log actualizado exitosamente:', {
      id: logEntry.id,
      nuevo_estado: webhookData.MessageStatus,
    });

    // Responder a Twilio con 200 OK
    return new Response('OK', {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error procesando webhook:', errorMessage);
    
    // Siempre responder 200 a Twilio para evitar reintentos
    return new Response('OK', {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
      },
    });
  }
});
