import { supabase } from "@/integrations/supabase/client";

interface WhatsAppOptions {
  phone: string;
  message: string;
  creatorId: string;
  creatorName: string;
  actionType: 'bonificaciones' | 'reclutamiento' | 'seguimiento' | 'general';
}

/**
 * Abre WhatsApp con un mensaje pre-rellenado
 * Usa https://wa.me/ que funciona en todos los dispositivos (móvil, tablet, desktop)
 * Registra la actividad en la tabla whatsapp_activity
 */
export const openWhatsApp = async ({
  phone,
  message,
  creatorId,
  creatorName,
  actionType
}: WhatsAppOptions): Promise<void> => {
  // Validación y limpieza del teléfono
  const cleanPhone = phone.replace(/\D/g, "");
  
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    throw new Error('Número de teléfono inválido. Debe tener entre 10 y 15 dígitos.');
  }
  
  // Agregar código de país si falta (México = 52)
  const phoneWithCode = cleanPhone.length === 10 
    ? `52${cleanPhone}` 
    : cleanPhone;

  // Registrar actividad ANTES de abrir WhatsApp
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('whatsapp_activity').insert({
        creator_id: creatorId,
        user_email: user.email || 'Unknown',
        action_type: actionType,
        message_preview: message.substring(0, 200),
        creator_name: creatorName
      });
    }
  } catch (error) {
    console.error('Error registrando actividad WhatsApp:', error);
    // No bloquear el flujo principal si falla el registro
  }

  // Usar wa.me que funciona en TODOS los dispositivos (web y app)
  const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
};
