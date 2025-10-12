export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      creator_bonificaciones: {
        Row: {
          bono_extra_usd: number | null
          cerca_de_objetivo: boolean | null
          created_at: string | null
          creator_id: string
          diam_live_mes: number
          dias_extra_22: number | null
          dias_live_mes: number
          dias_restantes: number
          es_prioridad_300k: boolean | null
          fecha_calculo: string
          grad_100k: boolean | null
          grad_1m: boolean | null
          grad_300k: boolean | null
          grad_500k: boolean | null
          grad_50k: boolean | null
          hito_12d_40h: boolean | null
          hito_20d_60h: boolean | null
          hito_22d_80h: boolean | null
          horas_live_mes: number
          id: string
          mes_referencia: string
          proximo_objetivo_tipo: string | null
          proximo_objetivo_valor: string | null
          req_diam_por_dia: number | null
          req_horas_por_dia: number | null
          updated_at: string | null
        }
        Insert: {
          bono_extra_usd?: number | null
          cerca_de_objetivo?: boolean | null
          created_at?: string | null
          creator_id: string
          diam_live_mes?: number
          dias_extra_22?: number | null
          dias_live_mes?: number
          dias_restantes?: number
          es_prioridad_300k?: boolean | null
          fecha_calculo?: string
          grad_100k?: boolean | null
          grad_1m?: boolean | null
          grad_300k?: boolean | null
          grad_500k?: boolean | null
          grad_50k?: boolean | null
          hito_12d_40h?: boolean | null
          hito_20d_60h?: boolean | null
          hito_22d_80h?: boolean | null
          horas_live_mes?: number
          id?: string
          mes_referencia: string
          proximo_objetivo_tipo?: string | null
          proximo_objetivo_valor?: string | null
          req_diam_por_dia?: number | null
          req_horas_por_dia?: number | null
          updated_at?: string | null
        }
        Update: {
          bono_extra_usd?: number | null
          cerca_de_objetivo?: boolean | null
          created_at?: string | null
          creator_id?: string
          diam_live_mes?: number
          dias_extra_22?: number | null
          dias_live_mes?: number
          dias_restantes?: number
          es_prioridad_300k?: boolean | null
          fecha_calculo?: string
          grad_100k?: boolean | null
          grad_1m?: boolean | null
          grad_300k?: boolean | null
          grad_500k?: boolean | null
          grad_50k?: boolean | null
          hito_12d_40h?: boolean | null
          hito_20d_60h?: boolean | null
          hito_22d_80h?: boolean | null
          horas_live_mes?: number
          id?: string
          mes_referencia?: string
          proximo_objetivo_tipo?: string | null
          proximo_objetivo_valor?: string | null
          req_diam_por_dia?: number | null
          req_horas_por_dia?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_bonificaciones_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_daily_stats: {
        Row: {
          created_at: string
          creator_id: string
          days_since_joining: number | null
          diamond_baseline: number | null
          diamonds_l30d: number | null
          engagement_rate: number | null
          followers: number | null
          id: string
          ingreso_estimado: number | null
          live_duration_l30d: number | null
          snapshot_date: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          days_since_joining?: number | null
          diamond_baseline?: number | null
          diamonds_l30d?: number | null
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          ingreso_estimado?: number | null
          live_duration_l30d?: number | null
          snapshot_date?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          days_since_joining?: number | null
          diamond_baseline?: number | null
          diamonds_l30d?: number | null
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          ingreso_estimado?: number | null
          live_duration_l30d?: number | null
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_daily_stats_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_feedback_impact: {
        Row: {
          created_at: string
          creator_id: string
          diamantes_after: number | null
          diamantes_before: number | null
          dias_live_after: number | null
          dias_live_before: number | null
          engagement_after: number | null
          engagement_before: number | null
          feedback_count: number
          id: string
          month_date: string
          views_after: number | null
          views_before: number | null
        }
        Insert: {
          created_at?: string
          creator_id: string
          diamantes_after?: number | null
          diamantes_before?: number | null
          dias_live_after?: number | null
          dias_live_before?: number | null
          engagement_after?: number | null
          engagement_before?: number | null
          feedback_count?: number
          id?: string
          month_date: string
          views_after?: number | null
          views_before?: number | null
        }
        Update: {
          created_at?: string
          creator_id?: string
          diamantes_after?: number | null
          diamantes_before?: number | null
          dias_live_after?: number | null
          dias_live_before?: number | null
          engagement_after?: number | null
          engagement_before?: number | null
          feedback_count?: number
          id?: string
          month_date?: string
          views_after?: number | null
          views_before?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_feedback_impact_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_interactions: {
        Row: {
          admin_nombre: string | null
          created_at: string
          creator_id: string
          fecha: string
          id: string
          notas: string | null
          tipo_interaccion: string
        }
        Insert: {
          admin_nombre?: string | null
          created_at?: string
          creator_id: string
          fecha?: string
          id?: string
          notas?: string | null
          tipo_interaccion: string
        }
        Update: {
          admin_nombre?: string | null
          created_at?: string
          creator_id?: string
          fecha?: string
          id?: string
          notas?: string | null
          tipo_interaccion?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_interactions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_metrics: {
        Row: {
          comments: number | null
          created_at: string | null
          creator_id: string | null
          diamantes: number | null
          engagement_rate: number | null
          fecha: string
          followers: number | null
          id: string
          likes: number | null
          shares: number | null
          views: number | null
        }
        Insert: {
          comments?: number | null
          created_at?: string | null
          creator_id?: string | null
          diamantes?: number | null
          engagement_rate?: number | null
          fecha: string
          followers?: number | null
          id?: string
          likes?: number | null
          shares?: number | null
          views?: number | null
        }
        Update: {
          comments?: number | null
          created_at?: string | null
          creator_id?: string | null
          diamantes?: number | null
          engagement_rate?: number | null
          fecha?: string
          followers?: number | null
          id?: string
          likes?: number | null
          shares?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_metrics_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_recommendations: {
        Row: {
          activa: boolean | null
          creator_id: string | null
          descripcion: string
          fecha_creacion: string | null
          icono: string | null
          id: string
          prioridad: string
          tipo: string
          titulo: string
        }
        Insert: {
          activa?: boolean | null
          creator_id?: string | null
          descripcion: string
          fecha_creacion?: string | null
          icono?: string | null
          id?: string
          prioridad: string
          tipo: string
          titulo: string
        }
        Update: {
          activa?: boolean | null
          creator_id?: string | null
          descripcion?: string
          fecha_creacion?: string | null
          icono?: string | null
          id?: string
          prioridad?: string
          tipo?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_recommendations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          categoria: string | null
          created_at: string | null
          diam_live_mes: number | null
          diamantes: number | null
          dias_desde_inicio: number | null
          dias_en_agencia: number | null
          dias_live: number | null
          dias_live_mes: number | null
          email: string | null
          engagement_rate: number | null
          followers: number | null
          graduacion: string | null
          hito_diamantes: number | null
          horas_live: number | null
          horas_live_mes: number | null
          id: string
          instagram: string | null
          last_month_diamantes: number | null
          last_month_engagement: number | null
          last_month_views: number | null
          manager: string | null
          nombre: string
          status: string | null
          telefono: string | null
          tiktok_username: string | null
          ultimo_calculo_mes: string | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          categoria?: string | null
          created_at?: string | null
          diam_live_mes?: number | null
          diamantes?: number | null
          dias_desde_inicio?: number | null
          dias_en_agencia?: number | null
          dias_live?: number | null
          dias_live_mes?: number | null
          email?: string | null
          engagement_rate?: number | null
          followers?: number | null
          graduacion?: string | null
          hito_diamantes?: number | null
          horas_live?: number | null
          horas_live_mes?: number | null
          id?: string
          instagram?: string | null
          last_month_diamantes?: number | null
          last_month_engagement?: number | null
          last_month_views?: number | null
          manager?: string | null
          nombre: string
          status?: string | null
          telefono?: string | null
          tiktok_username?: string | null
          ultimo_calculo_mes?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          categoria?: string | null
          created_at?: string | null
          diam_live_mes?: number | null
          diamantes?: number | null
          dias_desde_inicio?: number | null
          dias_en_agencia?: number | null
          dias_live?: number | null
          dias_live_mes?: number | null
          email?: string | null
          engagement_rate?: number | null
          followers?: number | null
          graduacion?: string | null
          hito_diamantes?: number | null
          horas_live?: number | null
          horas_live_mes?: number | null
          id?: string
          instagram?: string | null
          last_month_diamantes?: number | null
          last_month_engagement?: number | null
          last_month_views?: number | null
          manager?: string | null
          nombre?: string
          status?: string | null
          telefono?: string | null
          tiktok_username?: string | null
          ultimo_calculo_mes?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: []
      }
      managers: {
        Row: {
          activo: boolean | null
          created_at: string | null
          email: string | null
          id: string
          nombre: string
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          nombre: string
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      uploaded_reports: {
        Row: {
          filename: string
          id: string
          processed: boolean | null
          records_count: number | null
          uploaded_at: string | null
        }
        Insert: {
          filename: string
          id?: string
          processed?: boolean | null
          records_count?: number | null
          uploaded_at?: string | null
        }
        Update: {
          filename?: string
          id?: string
          processed?: boolean | null
          records_count?: number | null
          uploaded_at?: string | null
        }
        Relationships: []
      }
      user_daily_activity: {
        Row: {
          accumulated_seconds: number
          activity_date: string
          created_at: string
          daily_goal_hours: number
          id: string
          is_active: boolean
          last_activity_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accumulated_seconds?: number
          activity_date?: string
          created_at?: string
          daily_goal_hours?: number
          id?: string
          is_active?: boolean
          last_activity_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accumulated_seconds?: number
          activity_date?: string
          created_at?: string
          daily_goal_hours?: number
          id?: string
          is_active?: boolean
          last_activity_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_personal_messages: {
        Row: {
          creator_id: string
          personal_message: string
          updated_at: string
        }
        Insert: {
          creator_id: string
          personal_message: string
          updated_at?: string
        }
        Update: {
          creator_id?: string
          personal_message?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_personal_messages_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_work_goals: {
        Row: {
          created_at: string
          daily_hours_goal: number
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_hours_goal?: number
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          daily_hours_goal?: number
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_activity: {
        Row: {
          action_type: string
          creator_id: string
          creator_name: string | null
          id: string
          message_preview: string | null
          timestamp: string
          user_email: string
        }
        Insert: {
          action_type: string
          creator_id: string
          creator_name?: string | null
          id?: string
          message_preview?: string | null
          timestamp?: string
          user_email: string
        }
        Update: {
          action_type?: string
          creator_id?: string
          creator_name?: string | null
          id?: string
          message_preview?: string | null
          timestamp?: string
          user_email?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_activity_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: Record<PropertyKey, never> | { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "viewer" | "reclutador"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "viewer", "reclutador"],
    },
  },
} as const
