import { supabase } from "@/integrations/supabase/client";

/**
 * Servicio centralizado para todas las operaciones de analytics de creadores
 * Separa la lógica de negocio de los componentes UI
 */
export class CreatorAnalyticsService {
  /**
   * Obtiene bonificaciones del mes especificado con datos enriquecidos de creadores
   */
  async getBonificaciones(mesReferencia: string) {
    const { data, error } = await supabase
      .from('creator_bonificaciones')
      .select(`
        *,
        creators!inner(nombre, telefono)
      `)
      .eq('mes_referencia', mesReferencia)
      .order('diam_live_mes', { ascending: false });
    
    if (error) {
      console.error('Error en getBonificaciones:', error);
      throw new Error(`Error cargando bonificaciones: ${error.message}`);
    }

    console.log('Bonificaciones cargadas:', data?.length, 'registros');
    
    // Enriquecer datos con información del creador
    const enrichedData = data?.map(bonif => ({
      ...bonif,
      nombre: bonif.creators?.nombre || 'Sin nombre',
      telefono: bonif.creators?.telefono || null
    })) || [];
    
    console.log('Datos enriquecidos con teléfonos:', enrichedData.filter(b => b.telefono).length);
    
    return enrichedData;
  }

  /**
   * Calcula o recalcula bonificaciones para un mes específico
   */
  async calcularBonificaciones(mesReferencia?: string) {
    const mes = mesReferencia || new Date().toISOString().slice(0, 7) + '-01';
    
    const { data, error } = await supabase.functions.invoke(
      'calculate-bonificaciones-predictivo',
      { body: { mes_referencia: mes } }
    );
    
    if (error) {
      throw new Error(`Error calculando bonificaciones: ${error.message}`);
    }
    
    return data;
  }

  /**
   * Genera recomendación de IA para un creador específico
   */
  async generateRecommendation(creatorId: string) {
    const { data, error } = await supabase.functions.invoke(
      'process-creator-analytics',
      { body: { creatorId } }
    );
    
    if (error) {
      throw new Error(`Error generando recomendación IA: ${error.message}`);
    }
    
    return data;
  }

  /**
   * Obtiene estadísticas de live diario para un creador en un rango de fechas
   */
  async getLiveStats(creatorId: string, fechaInicio: string, fechaFin: string) {
    const { data, error } = await supabase
      .from('creator_live_daily')
      .select('*')
      .eq('creator_id', creatorId)
      .gte('fecha', fechaInicio)
      .lte('fecha', fechaFin)
      .order('fecha', { ascending: true });
    
    if (error) {
      throw new Error(`Error cargando estadísticas de live: ${error.message}`);
    }
    
    return data;
  }

  /**
   * Obtiene interacciones de un creador
   */
  async getInteractions(creatorId: string) {
    const { data, error } = await supabase
      .from('creator_interactions')
      .select('*')
      .eq('creator_id', creatorId)
      .order('fecha', { ascending: false });
    
    if (error) {
      throw new Error(`Error cargando interacciones: ${error.message}`);
    }
    
    return data;
  }

  /**
   * Agrega una nueva interacción para un creador
   */
  async addInteraction(creatorId: string, tipo: string, notas: string, adminNombre?: string) {
    const { error } = await supabase
      .from('creator_interactions')
      .insert({
        creator_id: creatorId,
        tipo_interaccion: tipo,
        notas: notas,
        admin_nombre: adminNombre || 'Admin'
      });
    
    if (error) {
      throw new Error(`Error guardando interacción: ${error.message}`);
    }
  }

  /**
   * Obtiene la recomendación más reciente activa para un creador
   */
  async getLatestRecommendation(creatorId: string) {
    const { data, error } = await supabase
      .from('creator_recommendations')
      .select('descripcion, tipo, titulo')
      .eq('creator_id', creatorId)
      .eq('activa', true)
      .order('fecha_creacion', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      throw new Error(`Error cargando recomendación: ${error.message}`);
    }
    
    return data;
  }

  /**
   * Calcula probabilidad de alcanzar objetivo basado en progreso actual
   */
  calcularProbabilidad(
    diamantesActuales: number,
    objetivo: number,
    diasRestantes: number,
    diasLive: number
  ): { color: string; label: string; porcentaje: number } {
    if (diamantesActuales >= objetivo) {
      return { color: 'bg-green-500', label: 'Logrado', porcentaje: 100 };
    }

    if (diasRestantes === 0) {
      return { color: 'bg-red-500', label: 'Tiempo agotado', porcentaje: 0 };
    }

    const faltantes = objetivo - diamantesActuales;
    const ritmoActual = diasLive > 0 ? diamantesActuales / diasLive : 0;
    const ritmoRequerido = faltantes / diasRestantes;

    if (ritmoActual === 0) {
      return { color: 'bg-red-500', label: 'Sin actividad', porcentaje: 0 };
    }

    const probabilidad = Math.min(100, Math.round((ritmoActual / ritmoRequerido) * 100));

    if (probabilidad >= 90) {
      return { color: 'bg-green-500', label: 'Muy probable', porcentaje: probabilidad };
    } else if (probabilidad >= 70) {
      return { color: 'bg-yellow-500', label: 'Probable', porcentaje: probabilidad };
    } else if (probabilidad >= 50) {
      return { color: 'bg-orange-500', label: 'Posible', porcentaje: probabilidad };
    } else {
      return { color: 'bg-red-500', label: 'Difícil', porcentaje: probabilidad };
    }
  }

  /**
   * Formatea un mensaje de WhatsApp para bonificaciones
   */
  formatBonificacionesMessage(bonif: {
    nombre?: string;
    dias_live_mes: number;
    horas_live_mes: number;
    diam_live_mes: number;
    faltan_50k?: number;
    faltan_100k?: number;
    faltan_300k?: number;
    req_diam_por_dia_50k?: number;
    req_diam_por_dia_100k?: number;
    req_diam_por_dia_300k?: number;
    dias_restantes: number;
  }): string {
    // Determinar el objetivo más cercano alcanzable
    const objetivo = bonif.diam_live_mes >= 100000 && bonif.faltan_300k && bonif.faltan_300k > 0 ? 300000 :
                     bonif.diam_live_mes >= 50000 && bonif.faltan_100k && bonif.faltan_100k > 0 ? 100000 : 50000;
    
    const faltantes = objetivo === 300000 ? bonif.faltan_300k :
                     objetivo === 100000 ? bonif.faltan_100k : bonif.faltan_50k;
    
    const reqDiario = objetivo === 300000 ? bonif.req_diam_por_dia_300k :
                     objetivo === 100000 ? bonif.req_diam_por_dia_100k : bonif.req_diam_por_dia_50k;

    const nombreCreador = bonif.nombre || 'Creador';
    const promedioHorasDia = bonif.dias_live_mes > 0 ? (bonif.horas_live_mes / bonif.dias_live_mes).toFixed(1) : '0';

    return `Hola ${nombreCreador}! 👋

📊 *Tu Avance del Mes (hasta ayer)*
📅 Días en LIVE: ${bonif.dias_live_mes} días
⏰ Horas totales: ${bonif.horas_live_mes.toFixed(1)}h (promedio ${promedioHorasDia}h/día)
💎 Diamantes acumulados: ${bonif.diam_live_mes.toLocaleString()}

🎯 *Objetivo ${(objetivo / 1000)}K*
Te faltan: ${faltantes?.toLocaleString()} 💎
Necesitas ganar: ~${reqDiario?.toLocaleString()} 💎 por día
⏳ Días restantes: ${bonif.dias_restantes}

${bonif.dias_restantes > 0 ? '¡Vamos con todo! 🔥 Tú puedes lograrlo 💪' : '¡El mes está por terminar! Da el último empujón 🚀'}`;
  }
}

// Instancia singleton para uso en la aplicación
export const creatorAnalytics = new CreatorAnalyticsService();
