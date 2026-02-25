// Auto-generated Supabase types. Regenerate with:
// supabase gen types typescript --project-id <project-id> > packages/types/src/database.ts

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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      analytics_events: {
        Row: {
          created_at: string
          device_type: string | null
          event_type: string
          fanflet_id: string
          id: string
          referrer: string | null
          resource_block_id: string | null
          visitor_hash: string | null
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          event_type: string
          fanflet_id: string
          id?: string
          referrer?: string | null
          resource_block_id?: string | null
          visitor_hash?: string | null
        }
        Update: {
          created_at?: string
          device_type?: string | null
          event_type?: string
          fanflet_id?: string
          id?: string
          referrer?: string | null
          resource_block_id?: string | null
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_fanflet_id_fkey"
            columns: ["fanflet_id"]
            isOneToOne: false
            referencedRelation: "fanflets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_resource_block_id_fkey"
            columns: ["resource_block_id"]
            isOneToOne: false
            referencedRelation: "resource_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      fanflets: {
        Row: {
          created_at: string
          description: string | null
          event_date: string | null
          event_name: string
          expiration_date: string | null
          expiration_preset: string
          id: string
          published_at: string | null
          show_expiration_notice: boolean
          slug: string
          speaker_id: string
          status: string
          survey_question_id: string | null
          theme_config: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_name?: string
          expiration_date?: string | null
          expiration_preset?: string
          id?: string
          published_at?: string | null
          show_expiration_notice?: boolean
          slug: string
          speaker_id: string
          status?: string
          survey_question_id?: string | null
          theme_config?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_name?: string
          expiration_date?: string | null
          expiration_preset?: string
          id?: string
          published_at?: string | null
          show_expiration_notice?: boolean
          slug?: string
          speaker_id?: string
          status?: string
          survey_question_id?: string | null
          theme_config?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fanflets_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fanflets_survey_question_id_fkey"
            columns: ["survey_question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_global: boolean
          key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_global?: boolean
          key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_global?: boolean
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          interest_tier: string | null
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          interest_tier?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          interest_tier?: string | null
          source?: string
        }
        Relationships: []
      }
      plan_features: {
        Row: {
          feature_flag_id: string
          plan_id: string
        }
        Insert: {
          feature_flag_id: string
          plan_id: string
        }
        Update: {
          feature_flag_id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_features_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          is_public: boolean
          limits: Json
          name: string
          price_monthly_cents: number | null
          price_yearly_cents: number | null
          sort_order: number
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          limits?: Json
          name: string
          price_monthly_cents?: number | null
          price_yearly_cents?: number | null
          sort_order?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          is_public?: boolean
          limits?: Json
          name?: string
          price_monthly_cents?: number | null
          price_yearly_cents?: number | null
          sort_order?: number
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      resource_blocks: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          fanflet_id: string
          file_path: string | null
          id: string
          image_url: string | null
          library_item_id: string | null
          metadata: Json | null
          section_name: string | null
          title: string
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          fanflet_id: string
          file_path?: string | null
          id?: string
          image_url?: string | null
          library_item_id?: string | null
          metadata?: Json | null
          section_name?: string | null
          title?: string
          type: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          fanflet_id?: string
          file_path?: string | null
          id?: string
          image_url?: string | null
          library_item_id?: string | null
          metadata?: Json | null
          section_name?: string | null
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_blocks_fanflet_id_fkey"
            columns: ["fanflet_id"]
            isOneToOne: false
            referencedRelation: "fanflets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_blocks_library_item_id_fkey"
            columns: ["library_item_id"]
            isOneToOne: false
            referencedRelation: "resource_library"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_library: {
        Row: {
          created_at: string
          description: string | null
          file_path: string | null
          file_size_bytes: number | null
          file_type: string | null
          id: string
          image_url: string | null
          media_metadata: Json | null
          metadata: Json | null
          section_name: string | null
          speaker_id: string
          title: string
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          image_url?: string | null
          media_metadata?: Json | null
          metadata?: Json | null
          section_name?: string | null
          speaker_id: string
          title?: string
          type: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          image_url?: string | null
          media_metadata?: Json | null
          metadata?: Json | null
          section_name?: string | null
          speaker_id?: string
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_library_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      speaker_feature_overrides: {
        Row: {
          created_at: string
          enabled: boolean
          feature_flag_id: string
          granted_by: string | null
          id: string
          reason: string | null
          speaker_id: string
        }
        Insert: {
          created_at?: string
          enabled: boolean
          feature_flag_id: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          speaker_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          feature_flag_id?: string
          granted_by?: string | null
          id?: string
          reason?: string | null
          speaker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaker_feature_overrides_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speaker_feature_overrides_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      speaker_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          features_snapshot: string[] | null
          id: string
          limits_snapshot: Json | null
          plan_id: string
          speaker_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          features_snapshot?: string[] | null
          id?: string
          limits_snapshot?: Json | null
          plan_id: string
          speaker_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          features_snapshot?: string[] | null
          id?: string
          limits_snapshot?: Json | null
          plan_id?: string
          speaker_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "speaker_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "speaker_subscriptions_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: true
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      speakers: {
        Row: {
          auth_user_id: string
          bio: string | null
          created_at: string
          email: string
          id: string
          name: string
          photo_url: string | null
          slug: string | null
          social_links: Json | null
          status: string
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          bio?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string
          photo_url?: string | null
          slug?: string | null
          social_links?: Json | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          bio?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          photo_url?: string | null
          slug?: string | null
          social_links?: Json | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          source_fanflet_id: string | null
          speaker_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          source_fanflet_id?: string | null
          speaker_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          source_fanflet_id?: string | null
          speaker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscribers_source_fanflet_id_fkey"
            columns: ["source_fanflet_id"]
            isOneToOne: false
            referencedRelation: "fanflets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscribers_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          options: Json | null
          question_text: string
          question_type: string
          speaker_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          options?: Json | null
          question_text: string
          question_type: string
          speaker_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          options?: Json | null
          question_text?: string
          question_type?: string
          speaker_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          created_at: string
          fanflet_id: string
          id: string
          question_id: string
          response_value: string
          visitor_hash: string | null
        }
        Insert: {
          created_at?: string
          fanflet_id: string
          id?: string
          question_id: string
          response_value: string
          visitor_hash?: string | null
        }
        Update: {
          created_at?: string
          fanflet_id?: string
          id?: string
          question_id?: string
          response_value?: string
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_fanflet_id_fkey"
            columns: ["fanflet_id"]
            isOneToOne: false
            referencedRelation: "fanflets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          auth_user_id: string
          created_at: string
          granted_by: string | null
          id: string
          role: string
          scope_id: string | null
          scope_type: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          granted_by?: string | null
          id?: string
          role: string
          scope_id?: string | null
          scope_type?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          granted_by?: string | null
          id?: string
          role?: string
          scope_id?: string | null
          scope_type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_platform_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
