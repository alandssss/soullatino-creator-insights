import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';
import { createHmac } from "node:crypto";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature',
};

interface TwilioWebhookBody {
  MessageSid?: string;
  MessageStatus?: string;
  SmsSid?: string;
  SmsStatus?: string;
  From: string;
  To: string;
  Body?: string;
  AccountSid: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

function normalizePhone(phone: string): string {
  // Quitar "whatsapp:" y caracteres no numéricos
  const cleaned = phone.replace('whatsapp:', '').replace(/\D/g, '');
  
  // Si tiene 10 dígitos, agregar código de país (México = 52)
  if (cleaned.length === 10) {
    return '+52' + cleaned;
  }
  
  // Si no tiene +, agregarlo
  if (!cleaned.startsWith('+')) {
    return '+' + cleaned;
  }
  
  return cleaned;
}

function formatFechaYYYYMMDD(fecha: string | Date): string {
  if (fecha instanceof Date) {
    return fecha.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  const [y, m, d] = fecha.toString().split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioWhatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
    
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

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // DETECTAR SI ES MENSAJE ENTRANTE (del creator) o STATUS UPDATE (de Twilio)
    const isIncomingMessage = !params.MessageStatus && !params.SmsStatus;
    
    if (isIncomingMessage) {
      console.log('📨 Mensaje entrante del usuario');
      
      const fromPhone = params.From;
      const messageBody = params.Body?.toLowerCase().trim() || '';
      
      console.log(`📱 De: ${fromPhone}, Mensaje: "${messageBody}"`);

      // Normalizar teléfono
      const phoneNormalized = normalizePhone(fromPhone);
      
      // Buscar creator por teléfono
      const { data: creator } = await supabase
        .from('creators')
        .select('id, nombre, telefono')
        .or(`telefono.eq.${phoneNormalized},telefono.eq.${phoneNormalized.replace('+', '')}`)
        .single();

      if (!creator) {
        console.warn('⚠️ Teléfono no registrado:', phoneNormalized);
        
        const mensajeNoRegistrado = 
          `Hola 👋\n\n` +
          `No encontramos tu registro en nuestro sistema.\n\n` +
          `Si eres parte de Soullatino, contacta a tu manager para verificar tu número de teléfono 📱\n` +
          `— Agencia Soullatino`;

        // Enviar respuesta
        if (twilioAccountSid && twilioWhatsappNumber) {
          await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                From: `whatsapp:${twilioWhatsappNumber}`,
                To: fromPhone,
                Body: mensajeNoRegistrado,
              }),
            }
          );
        }

        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      console.log('✅ Creator encontrado:', creator.nombre);

      // Detectar comando "batalla"
      if (messageBody.includes('batalla')) {
        console.log('🔍 Consultando batallas del creator...');
        
        // Buscar batallas futuras del creator
        const { data: batallas } = await supabase
          .from('batallas')
          .select('fecha, hora, oponente, tipo, guantes, reto, estado')
          .eq('creator_id', creator.id)
          .gte('fecha', new Date().toISOString().split('T')[0])
          .neq('estado', 'cancelada')
          .order('fecha', { ascending: true })
          .order('hora', { ascending: true })
          .limit(5);

        console.log(`📊 Batallas encontradas: ${batallas?.length || 0}`);

        let mensajeRespuesta = '';

        if (batallas && batallas.length > 0) {
          mensajeRespuesta = `Hola ${creator.nombre} 👋\n\nTus próximas batallas en Soullatino:\n\n`;
          
          batallas.forEach((b, idx) => {
            const fechaFmt = b.fecha ? formatFechaYYYYMMDD(b.fecha) : 'sin fecha';
            const horaFmt = b.hora ? b.hora.substring(0, 5) : 'sin hora';
            
            mensajeRespuesta += `🗓️ *Batalla ${idx + 1}*\n`;
            mensajeRespuesta += `📅 ${fechaFmt}\n`;
            mensajeRespuesta += `🕒 ${horaFmt}\n`;
            mensajeRespuesta += `🆚 Vs: ${b.oponente || 'por confirmar'}\n`;
            mensajeRespuesta += `⚡ Tipo: ${b.tipo}\n`;
            mensajeRespuesta += `🧤 Guantes: ${b.guantes ? 'Sí' : 'No'}\n`;
            if (b.reto) {
              mensajeRespuesta += `🎯 Reto: ${b.reto}\n`;
            }
            mensajeRespuesta += '\n';
          });
          
          mensajeRespuesta += `¡Prepárate y conéctate 10 min antes! 💪\n— Agencia Soullatino`;
        } else {
          mensajeRespuesta = 
            `Hola ${creator.nombre} 👋\n\n` +
            `No tienes batallas programadas próximamente 🤔\n\n` +
            `Mantente al pendiente, te avisaremos cuando haya nuevas batallas 💬\n` +
            `— Agencia Soullatino`;
        }

        console.log('📤 Enviando respuesta al creator...');

        // Enviar respuesta vía Twilio
        if (twilioAccountSid && twilioWhatsappNumber) {
          const twilioRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                From: `whatsapp:${twilioWhatsappNumber}`,
                To: fromPhone,
                Body: mensajeRespuesta,
              }),
            }
          );

          const twilioData = await twilioRes.json();
          console.log('✅ Respuesta enviada, SID:', twilioData.sid);

          // Loguear la consulta
          await supabase.from('logs_whatsapp').insert({
            telefono: phoneNormalized,
            mensaje_enviado: mensajeRespuesta,
            respuesta: { 
              type: 'consulta_batallas',
              creator_id: creator.id,
              batallas_encontradas: batallas?.length || 0,
              mensaje_original: params.Body
            },
            twilio_message_sid: twilioData.sid,
            twilio_status: twilioData.status,
          });
        }

        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      // Mensaje no reconocido
      console.log('ℹ️ Mensaje no reconocido, ignorando');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // ES UN STATUS UPDATE de Twilio
    console.log('📊 Status update de Twilio');
    
    const webhookData: TwilioWebhookBody = {
      MessageSid: params.MessageSid || params.SmsSid,
      MessageStatus: params.MessageStatus || params.SmsStatus,
      From: params.From,
      To: params.To,
      AccountSid: params.AccountSid,
      ErrorCode: params.ErrorCode,
      ErrorMessage: params.ErrorMessage,
    };

    console.log('📩 Status update:', {
      MessageSid: webhookData.MessageSid,
      Status: webhookData.MessageStatus,
      ErrorCode: webhookData.ErrorCode,
    });

    if (!webhookData.MessageSid || !webhookData.MessageStatus) {
      console.error('❌ Datos incompletos en status update');
      return new Response('Missing required fields', { status: 400, headers: corsHeaders });
    }

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
