import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Security: Strict validation schemas to prevent injection attacks
const phoneSchema = z.string()
  .regex(/^[1-9]\d{9,14}$/, "Número de teléfono inválido")
  .max(15, "Número de teléfono demasiado largo");

const messageSchema = z.string()
  .min(1, "El mensaje no puede estar vacío")
  .max(2000, "El mensaje es demasiado largo")
  .refine(
    (msg) => !msg.toLowerCase().includes('javascript:') && !msg.includes('<script'),
    "El mensaje contiene contenido no permitido"
  );

const creatorIdSchema = z.string().uuid("ID de creador inválido");
const creatorNameSchema = z.string().min(1).max(200);
const actionTypeSchema = z.enum(['bonificaciones', 'reclutamiento', 'seguimiento', 'general']);

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
  // Security: Validate all inputs with Zod schemas
  try {
    creatorIdSchema.parse(creatorId);
    creatorNameSchema.parse(creatorName);
    actionTypeSchema.parse(actionType);
    messageSchema.parse(message);
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      throw new Error(validationError.issues[0].message);
    }
    throw validationError;
  }
  
  // Validación y limpieza del teléfono
  const cleanPhone = phone.replace(/\D/g, "");
  
  // Agregar código de país si falta (México = 52)
  const phoneWithCode = cleanPhone.length === 10 
    ? `52${cleanPhone}` 
    : cleanPhone;
  
  // Security: Validate final phone number format
  try {
    phoneSchema.parse(phoneWithCode);
  } catch (validationError) {
    if (validationError instanceof z.ZodError) {
      throw new Error('Número de teléfono inválido. Debe tener entre 10 y 15 dígitos.');
    }
    throw validationError;
  }

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

  // Security: Use URL constructor to prevent parameter injection
  const url = new URL(`https://wa.me/${phoneWithCode}`);
  url.searchParams.set('text', message);
  
  // Usar un enlace temporal para evitar bloqueos del navegador
  const link = document.createElement('a');
  link.href = url.toString();
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export function normalizePhoneE164(raw: string, def = "MX"): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (raw.trim().startsWith("+")) return digits.replace(/\D/g,"");
  const cc = ({MX:"52",CO:"57",VE:"58"} as any)[def] || "52";
  if (digits.length === 10) return cc + digits;
  if (digits.length >= 11) return digits;
  return null;
}
export function waLink(e164: string, message: string) {
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}
export function buildWaMessage(c: any) {
  const nombre = c?.nombre || c?.tiktok_username || "";
  const dias   = c?.dias_live ?? c?.dias ?? 0;
  const horas  = c?.horas_live ?? c?.horas ?? 0;
  const diam   = c?.diamantes ?? 0;
  return `Hola ${nombre}, soy tu manager de Soullatino.
Métricas al momento:
• Días: ${dias}
• Horas: ${horas}
• Diamantes: ${diam}
¿Listo para el plan de hoy?`;
}
