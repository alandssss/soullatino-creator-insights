import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatallaData {
  id: string;
  fecha: string;
  hora: string;
  oponente: string;
  guantes: boolean;
  reto: string | null;
  tipo: '1v1' | '3v3';
  creator: {
    id: string;
    nombre: string;
    telefono: string | null;
  };
}

interface TwilioResponse {
  sid: string;
  status: string;
  error_code?: string;
  error_message?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validar autenticación
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Obtener batallaId del body
    const { batallaId } = await req.json();
    if (!batallaId) {
      return new Response(
        JSON.stringify({ error: 'batallaId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Procesando batalla:', batallaId);

    // Buscar datos de la batalla con JOIN a creators
    const { data: batalla, error: batallaError } = await supabase
      .from('batallas')
      .select(`
        id,
        fecha,
        hora,
        oponente,
        guantes,
        reto,
        tipo,
        creator:creators!inner(id, nombre, telefono)
      `)
      .eq('id', batallaId)
      .single();

    if (batallaError || !batalla) {
      console.error('Error buscando batalla:', batallaError);
      return new Response(
        JSON.stringify({ error: 'Batalla no encontrada', details: batallaError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const batallaData = batalla as unknown as BatallaData;

    // Validar que el creator tenga teléfono
    if (!batallaData.creator.telefono) {
      console.error('Creator sin teléfono:', batallaData.creator.id);
      
      // Registrar log de error
      await supabase.from('logs_whatsapp').insert({
        batalla_id: batallaId,
        telefono: 'N/A',
        mensaje_enviado: 'ERROR: Creator sin teléfono registrado',
        error_message: 'El creator no tiene teléfono registrado',
      });

      return new Response(
        JSON.stringify({ error: 'El creator no tiene teléfono registrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Formatear teléfono a E.164 (agregar código de país si falta)
    let telefono = batallaData.creator.telefono.replace(/\D/g, '');
    if (telefono.length === 10) {
      telefono = '52' + telefono; // México
    }
    const telefonoE164 = '+' + telefono;

    // Formatear fecha (DD/MM/YYYY)
    const fechaObj = new Date(batallaData.fecha + 'T00:00:00');
    const fechaFormateada = fechaObj.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Construir mensaje
    const mensaje = `Hola ${batallaData.creator.nombre} 👋
Te acaba de llegar una *nueva batalla* en Soullatino ⚔️

📅 *Fecha:* ${fechaFormateada}
🕒 *Hora:* ${batallaData.hora}
🆚 *Vs:* ${batallaData.oponente}
🧤 *Guantes:* ${batallaData.guantes ? 'Sí' : 'No'}
🎯 *Reto:* ${batallaData.reto || 'No especificado'}
⚡ *Tipo:* ${batallaData.tipo}

Conéctate 10 min antes y si no puedes, avísanos 💬
— Agencia Soullatino`;

    console.log('Enviando a:', telefonoE164);

    // Obtener credenciales de Twilio
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsappNumber) {
      console.error('Faltan credenciales de Twilio');
      return new Response(
        JSON.stringify({ error: 'Configuración de Twilio incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar mensaje vía Twilio API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const twilioAuth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    const webhookUrl = `${supabaseUrl}/functions/v1/whatsapp-webhook`;

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: twilioWhatsappNumber,
        To: `whatsapp:${telefonoE164}`,
        Body: mensaje,
        StatusCallback: webhookUrl,
      }),
    });

    const twilioData: TwilioResponse = await twilioResponse.json();

    console.log('Respuesta Twilio:', twilioData);

    // Registrar log
    await supabase.from('logs_whatsapp').insert({
      batalla_id: batallaId,
      telefono: telefonoE164,
      mensaje_enviado: mensaje,
      respuesta: twilioData,
      twilio_message_sid: twilioData.sid || null,
      twilio_status: twilioData.status || 'error',
      error_message: twilioData.error_message || null,
    });

    // Si el envío fue exitoso, actualizar batalla
    if (twilioResponse.ok && twilioData.sid) {
      await supabase
        .from('batallas')
        .update({ notificacion_enviada: true })
        .eq('id', batallaId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Notificación enviada correctamente',
          messageSid: twilioData.sid,
          status: twilioData.status 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          error: 'Error enviando mensaje', 
          details: twilioData 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error en send-batalla:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
