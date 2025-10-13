import { supabase } from "@/integrations/supabase/client";
import { openWhatsApp } from "@/utils/whatsapp";
import { Tables } from "@/integrations/supabase/types";

type Creator = Tables<"creators">;
type Interaction = Tables<"creator_interactions">;

export interface InteractionDetails {
  tipo_interaccion: string;
  notas: string;
  admin_nombre?: string;
}

export interface AIAdviceResponse {
  advice: string;
  milestone?: string;
  milestoneDescription?: string;
}

/**
 * Servicio centralizado para gestión de interacciones con creadores
 * Maneja IA, grabación de interacciones y WhatsApp
 */
export class InteractionService {
  /**
   * Genera consejo de IA analizando datos del creador
   */
  static async generateAdvice(creatorId: string): Promise<AIAdviceResponse> {
    const { data, error } = await supabase.functions.invoke("process-creator-analytics", {
      body: { creatorId },
    });

    if (error) {
      throw new Error(`Error generando consejo IA: ${error.message}`);
    }

    if (!data?.recommendation) {
      throw new Error("No se recibió recomendación de la IA");
    }

    return {
      advice: data.recommendation,
      milestone: data.milestone,
      milestoneDescription: data.milestoneDescription,
    };
  }

  /**
   * Carga la última recomendación activa desde la BD
   */
  static async getLatestRecommendation(creatorId: string) {
    const { data, error } = await supabase
      .from("creator_recommendations")
      .select("descripcion, tipo, titulo")
      .eq("creator_id", creatorId)
      .eq("activa", true)
      .order("fecha_creacion", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Error cargando recomendación: ${error.message}`);
    }

    return data
      ? {
          advice: data.descripcion,
          milestone: data.tipo || "",
          title: data.titulo,
        }
      : null;
  }

  /**
   * Graba una nueva interacción
   */
  static async recordInteraction(
    creatorId: string,
    details: InteractionDetails
  ): Promise<Interaction> {
    const { data, error } = await supabase
      .from("creator_interactions")
      .insert({
        creator_id: creatorId,
        tipo_interaccion: details.tipo_interaccion,
        notas: details.notas,
        admin_nombre: details.admin_nombre || "Admin",
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Error guardando interacción: ${error.message}`);
    }

    return data;
  }

  /**
   * Obtiene todas las interacciones de un creador
   */
  static async getInteractions(creatorId: string): Promise<Interaction[]> {
    const { data, error } = await supabase
      .from("creator_interactions")
      .select("*")
      .eq("creator_id", creatorId)
      .order("fecha", { ascending: false });

    if (error) {
      throw new Error(`Error cargando interacciones: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Genera mensaje de WhatsApp personalizado
   */
  static generateWhatsAppMessage(creator: Creator, userName: string = "el equipo"): string {
    return `Hola soy ${userName} de SoulLatino, tus estadisticas al dia de ayer son:\n\n📅 ${
      creator.dias_live || 0
    } Dias Live\n⏰ ${(creator.horas_live || 0).toFixed(1)} Horas Live\n💎 ${(
      creator.diamantes || 0
    ).toLocaleString()} Diamantes\n\n¿Podemos hablar para ayudarte en como mejorar ese desempeño?`;
  }

  /**
   * Envía mensaje por WhatsApp (usa el fix universal)
   */
  static async sendWhatsAppMessage(
    creator: Creator,
    message: string,
    actionType: 'bonificaciones' | 'reclutamiento' | 'seguimiento' | 'general' = 'seguimiento'
  ): Promise<void> {
    if (!creator.telefono) {
      throw new Error("El creador no tiene número de teléfono registrado");
    }

    if (!message || message.trim() === "") {
      throw new Error("El mensaje no puede estar vacío");
    }

    await openWhatsApp({
      phone: creator.telefono,
      message: message,
      creatorId: creator.id,
      creatorName: creator.nombre,
      actionType,
    });
  }
}

// Exportar instancia singleton
export const interactionService = InteractionService;
