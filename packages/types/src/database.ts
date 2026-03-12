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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          category: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown
          target_id: string | null
          target_type: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          category: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          category?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown
          target_id?: string | null
          target_type?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          role?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          token_hash?: string
        }
        Relationships: []
      }
      admin_notification_preferences: {
        Row: {
          admin_user_id: string
          created_at: string
          fanflet_created: boolean
          id: string
          onboarding_completed: boolean
          speaker_signup: boolean
          sponsor_inquiry: boolean
          sponsor_signup: boolean
          timezone: string | null
          updated_at: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          fanflet_created?: boolean
          id?: string
          onboarding_completed?: boolean
          speaker_signup?: boolean
          sponsor_inquiry?: boolean
          sponsor_signup?: boolean
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          fanflet_created?: boolean
          id?: string
          onboarding_completed?: boolean
          speaker_signup?: boolean
          sponsor_inquiry?: boolean
          sponsor_signup?: boolean
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          city: string | null
          country_code: string | null
          created_at: string
          device_type: string | null
          event_type: string
          fanflet_id: string
          id: string
          is_bot: boolean | null
          referrer: string | null
          referrer_category: string | null
          region: string | null
          resource_block_id: string | null
          source: string | null
          visitor_hash: string | null
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          event_type: string
          fanflet_id: string
          id?: string
          is_bot?: boolean | null
          referrer?: string | null
          referrer_category?: string | null
          region?: string | null
          resource_block_id?: string | null
          source?: string | null
          visitor_hash?: string | null
        }
        Update: {
          city?: string | null
          country_code?: string | null
          created_at?: string
          device_type?: string | null
          event_type?: string
          fanflet_id?: string
          id?: string
          is_bot?: boolean | null
          referrer?: string | null
          referrer_category?: string | null
          region?: string | null
          resource_block_id?: string | null
          source?: string | null
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
      audience_accounts: {
        Row: {
          auth_user_id: string
          avatar_url: string | null
          consent_recorded_at: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
          email: string
          id: string
          linkedin_consent_scope: Json | null
          linkedin_profile: Json | null
          notification_prefs: Json | null
          privacy_policy_version: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          avatar_url?: string | null
          consent_recorded_at?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          email: string
          id?: string
          linkedin_consent_scope?: Json | null
          linkedin_profile?: Json | null
          notification_prefs?: Json | null
          privacy_policy_version?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          avatar_url?: string | null
          consent_recorded_at?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          email?: string
          id?: string
          linkedin_consent_scope?: Json | null
          linkedin_profile?: Json | null
          notification_prefs?: Json | null
          privacy_policy_version?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audience_saved_fanflets: {
        Row: {
          audience_account_id: string
          fanflet_id: string
          id: string
          save_source: string
          saved_at: string
        }
        Insert: {
          audience_account_id: string
          fanflet_id: string
          id?: string
          save_source?: string
          saved_at?: string
        }
        Update: {
          audience_account_id?: string
          fanflet_id?: string
          id?: string
          save_source?: string
          saved_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audience_saved_fanflets_audience_account_id_fkey"
            columns: ["audience_account_id"]
            isOneToOne: false
            referencedRelation: "audience_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audience_saved_fanflets_fanflet_id_fkey"
            columns: ["fanflet_id"]
            isOneToOne: false
            referencedRelation: "fanflets"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_deliveries: {
        Row: {
          audience_type: string
          channel: string
          communication_id: string
          email_hash: string | null
          email_provider: string | null
          id: string
          provider_message_id: string | null
          recipient_id: string | null
          recipient_type: string
          sent_at: string
        }
        Insert: {
          audience_type: string
          channel?: string
          communication_id: string
          email_hash?: string | null
          email_provider?: string | null
          id?: string
          provider_message_id?: string | null
          recipient_id?: string | null
          recipient_type: string
          sent_at?: string
        }
        Update: {
          audience_type?: string
          channel?: string
          communication_id?: string
          email_hash?: string | null
          email_provider?: string | null
          id?: string
          provider_message_id?: string | null
          recipient_id?: string | null
          recipient_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_deliveries_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "platform_communications"
            referencedColumns: ["id"]
          },
        ]
      }
      data_subject_request_steps: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string
          details: Json | null
          error_message: string | null
          id: string
          request_id: string
          status: string
          step_category: string
          step_name: string
          step_order: number
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          request_id: string
          status?: string
          step_category: string
          step_name: string
          step_order: number
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          request_id?: string
          status?: string
          step_category?: string
          step_name?: string
          step_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "data_subject_request_steps_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "data_subject_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      data_subject_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cancelled_at: string | null
          cancelled_reason: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          data_snapshot_path: string | null
          hold_reason: string | null
          id: string
          notification_email: string | null
          notification_method: string | null
          notification_sent_at: string | null
          processing_started_at: string | null
          regulation: string | null
          regulatory_deadline: string | null
          request_type: string
          source: string
          source_reference: string | null
          status: string
          subject_auth_user_id: string | null
          subject_email: string
          subject_name: string | null
          subject_type: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          data_snapshot_path?: string | null
          hold_reason?: string | null
          id?: string
          notification_email?: string | null
          notification_method?: string | null
          notification_sent_at?: string | null
          processing_started_at?: string | null
          regulation?: string | null
          regulatory_deadline?: string | null
          request_type: string
          source: string
          source_reference?: string | null
          status?: string
          subject_auth_user_id?: string | null
          subject_email: string
          subject_name?: string | null
          subject_type: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          data_snapshot_path?: string | null
          hold_reason?: string | null
          id?: string
          notification_email?: string | null
          notification_method?: string | null
          notification_sent_at?: string | null
          processing_started_at?: string | null
          regulation?: string | null
          regulatory_deadline?: string | null
          request_type?: string
          source?: string
          source_reference?: string | null
          status?: string
          subject_auth_user_id?: string | null
          subject_email?: string
          subject_name?: string | null
          subject_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      demo_environments: {
        Row: {
          ai_generated_payload: Json | null
          auth_user_id: string | null
          converted_at: string | null
          converted_to_speaker_id: string | null
          created_at: string | null
          created_by: string
          demo_type: string
          error_message: string | null
          expires_at: string
          id: string
          notes: string | null
          prospect_email: string | null
          prospect_name: string
          prospect_notes: string | null
          prospect_specialty: string | null
          research_input: Json | null
          seed_manifest: Json | null
          speaker_id: string | null
          sponsor_account_ids: string[] | null
          sponsor_id: string | null
          status: string
        }
        Insert: {
          ai_generated_payload?: Json | null
          auth_user_id?: string | null
          converted_at?: string | null
          converted_to_speaker_id?: string | null
          created_at?: string | null
          created_by: string
          demo_type?: string
          error_message?: string | null
          expires_at: string
          id?: string
          notes?: string | null
          prospect_email?: string | null
          prospect_name: string
          prospect_notes?: string | null
          prospect_specialty?: string | null
          research_input?: Json | null
          seed_manifest?: Json | null
          speaker_id?: string | null
          sponsor_account_ids?: string[] | null
          sponsor_id?: string | null
          status?: string
        }
        Update: {
          ai_generated_payload?: Json | null
          auth_user_id?: string | null
          converted_at?: string | null
          converted_to_speaker_id?: string | null
          created_at?: string | null
          created_by?: string
          demo_type?: string
          error_message?: string | null
          expires_at?: string
          id?: string
          notes?: string | null
          prospect_email?: string | null
          prospect_name?: string
          prospect_notes?: string | null
          prospect_specialty?: string | null
          research_input?: Json | null
          seed_manifest?: Json | null
          speaker_id?: string | null
          sponsor_account_ids?: string[] | null
          sponsor_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_environments_converted_to_speaker_id_fkey"
            columns: ["converted_to_speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_environments_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demo_environments_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsor_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fanflets: {
        Row: {
          confirmation_email_config: Json | null
          created_at: string
          description: string | null
          event_date: string | null
          event_name: string
          expiration_date: string | null
          expiration_preset: string
          id: string
          published_at: string | null
          show_event_name: boolean
          show_expiration_notice: boolean
          slug: string
          speaker_id: string
          status: string
          survey_question_id: string | null
          survey_question_ids: string[] | null
          theme_config: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          confirmation_email_config?: Json | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_name?: string
          expiration_date?: string | null
          expiration_preset?: string
          id?: string
          published_at?: string | null
          show_event_name?: boolean
          show_expiration_notice?: boolean
          slug: string
          speaker_id: string
          status?: string
          survey_question_id?: string | null
          survey_question_ids?: string[] | null
          theme_config?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          confirmation_email_config?: Json | null
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_name?: string
          expiration_date?: string | null
          expiration_preset?: string
          id?: string
          published_at?: string | null
          show_event_name?: boolean
          show_expiration_notice?: boolean
          slug?: string
          speaker_id?: string
          status?: string
          survey_question_id?: string | null
          survey_question_ids?: string[] | null
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
      impersonation_actions: {
        Row: {
          action_details: Json | null
          action_path: string | null
          action_type: string
          created_at: string
          id: string
          session_id: string
        }
        Insert: {
          action_details?: Json | null
          action_path?: string | null
          action_type: string
          created_at?: string
          id?: string
          session_id: string
        }
        Update: {
          action_details?: Json | null
          action_path?: string | null
          action_type?: string
          created_at?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "impersonation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      impersonation_sessions: {
        Row: {
          admin_id: string | null
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          ip_address: unknown
          reason: string | null
          saved_auth_cookies: Json | null
          started_at: string | null
          target_role: string
          target_user_id: string | null
          user_agent: string | null
          write_enabled: boolean
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          ended_at?: string | null
          expires_at: string
          id?: string
          ip_address?: unknown
          reason?: string | null
          saved_auth_cookies?: Json | null
          started_at?: string | null
          target_role: string
          target_user_id?: string | null
          user_agent?: string | null
          write_enabled?: boolean
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          ip_address?: unknown
          reason?: string | null
          saved_auth_cookies?: Json | null
          started_at?: string | null
          target_role?: string
          target_user_id?: string | null
          user_agent?: string | null
          write_enabled?: boolean
        }
        Relationships: []
      }
      impersonation_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          session_id: string
          token_hash: string
          used: boolean
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          session_id: string
          token_hash: string
          used?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          session_id?: string
          token_hash?: string
          used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_tokens_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "impersonation_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          error_message: string | null
          id: string
          last_sync_at: string | null
          platform: string
          refresh_token_encrypted: string | null
          settings: Json | null
          sponsor_id: string
          status: string
          token_expires_at: string | null
          updated_at: string
          webhook_urls: Json | null
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          platform: string
          refresh_token_encrypted?: string | null
          settings?: Json | null
          sponsor_id: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          webhook_urls?: Json | null
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_sync_at?: string | null
          platform?: string
          refresh_token_encrypted?: string | null
          settings?: Json | null
          sponsor_id?: string
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          webhook_urls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsor_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_events: {
        Row: {
          attempt_count: number
          connection_id: string | null
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json | null
          platform: string
          resolved_at: string | null
          sponsor_id: string
          status: string
        }
        Insert: {
          attempt_count?: number
          connection_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          platform: string
          resolved_at?: string | null
          sponsor_id: string
          status?: string
        }
        Update: {
          attempt_count?: number
          connection_id?: string | null
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          platform?: string
          resolved_at?: string | null
          sponsor_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "integration_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_events_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsor_accounts"
            referencedColumns: ["id"]
          },
        ]
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
      mcp_api_keys: {
        Row: {
          auth_user_id: string
          created_at: string
          expires_at: string | null
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          role: string
          scopes: string[] | null
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          role?: string
          scopes?: string[] | null
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          role?: string
          scopes?: string[] | null
        }
        Relationships: []
      }
      mcp_audit_log: {
        Row: {
          admin_action: boolean | null
          api_key_id: string | null
          auth_user_id: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          input_summary: Json | null
          result_status: string
          target_entity_id: string | null
          target_entity_type: string | null
          tool_name: string
        }
        Insert: {
          admin_action?: boolean | null
          api_key_id?: string | null
          auth_user_id: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_summary?: Json | null
          result_status: string
          target_entity_id?: string | null
          target_entity_type?: string | null
          tool_name: string
        }
        Update: {
          admin_action?: boolean | null
          api_key_id?: string | null
          auth_user_id?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          input_summary?: Json | null
          result_status?: string
          target_entity_id?: string | null
          target_entity_type?: string | null
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_audit_log_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "mcp_api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_oauth_clients: {
        Row: {
          client_id: string
          client_id_issued_at: number | null
          client_name: string | null
          client_secret: string | null
          client_secret_expires_at: number | null
          client_uri: string | null
          created_at: string
          grant_types: string[] | null
          logo_uri: string | null
          redirect_uris: string[]
          response_types: string[] | null
          scope: string | null
          token_endpoint_auth_method: string | null
        }
        Insert: {
          client_id?: string
          client_id_issued_at?: number | null
          client_name?: string | null
          client_secret?: string | null
          client_secret_expires_at?: number | null
          client_uri?: string | null
          created_at?: string
          grant_types?: string[] | null
          logo_uri?: string | null
          redirect_uris?: string[]
          response_types?: string[] | null
          scope?: string | null
          token_endpoint_auth_method?: string | null
        }
        Update: {
          client_id?: string
          client_id_issued_at?: number | null
          client_name?: string | null
          client_secret?: string | null
          client_secret_expires_at?: number | null
          client_uri?: string | null
          created_at?: string
          grant_types?: string[] | null
          logo_uri?: string | null
          redirect_uris?: string[]
          response_types?: string[] | null
          scope?: string | null
          token_endpoint_auth_method?: string | null
        }
        Relationships: []
      }
      mcp_oauth_codes: {
        Row: {
          auth_user_id: string
          client_id: string
          code: string
          code_challenge: string
          created_at: string
          expires_at: string
          redirect_uri: string
          scope: string | null
          state: string | null
          used: boolean | null
        }
        Insert: {
          auth_user_id: string
          client_id: string
          code?: string
          code_challenge: string
          created_at?: string
          expires_at?: string
          redirect_uri: string
          scope?: string | null
          state?: string | null
          used?: boolean | null
        }
        Update: {
          auth_user_id?: string
          client_id?: string
          code?: string
          code_challenge?: string
          created_at?: string
          expires_at?: string
          redirect_uri?: string
          scope?: string | null
          state?: string | null
          used?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_oauth_codes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mcp_oauth_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      mcp_oauth_pending_requests: {
        Row: {
          client_id: string
          code_challenge: string
          created_at: string
          id: string
          redirect_uri: string
          scope: string | null
          state: string | null
        }
        Insert: {
          client_id: string
          code_challenge: string
          created_at?: string
          id?: string
          redirect_uri: string
          scope?: string | null
          state?: string | null
        }
        Update: {
          client_id?: string
          code_challenge?: string
          created_at?: string
          id?: string
          redirect_uri?: string
          scope?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_oauth_pending_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mcp_oauth_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      mcp_oauth_tokens: {
        Row: {
          access_token_expires_at: string
          access_token_hash: string
          auth_user_id: string
          client_id: string
          created_at: string
          id: string
          refresh_token_expires_at: string | null
          refresh_token_hash: string | null
          revoked_at: string | null
          scope: string | null
        }
        Insert: {
          access_token_expires_at: string
          access_token_hash: string
          auth_user_id: string
          client_id: string
          created_at?: string
          id?: string
          refresh_token_expires_at?: string | null
          refresh_token_hash?: string | null
          revoked_at?: string | null
          scope?: string | null
        }
        Update: {
          access_token_expires_at?: string
          access_token_hash?: string
          auth_user_id?: string
          client_id?: string
          created_at?: string
          id?: string
          refresh_token_expires_at?: string | null
          refresh_token_hash?: string | null
          revoked_at?: string | null
          scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_oauth_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mcp_oauth_clients"
            referencedColumns: ["client_id"]
          },
        ]
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
      platform_communication_preferences: {
        Row: {
          category: string
          email_hash: string | null
          id: string
          opted_in: boolean
          opted_in_at: string | null
          recipient_type: string
          speaker_id: string | null
          sponsor_account_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          email_hash?: string | null
          id?: string
          opted_in?: boolean
          opted_in_at?: string | null
          recipient_type: string
          speaker_id?: string | null
          sponsor_account_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          email_hash?: string | null
          id?: string
          opted_in?: boolean
          opted_in_at?: string | null
          recipient_type?: string
          speaker_id?: string | null
          sponsor_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_communication_preferences_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_communication_preferences_sponsor_account_id_fkey"
            columns: ["sponsor_account_id"]
            isOneToOne: false
            referencedRelation: "sponsor_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_communication_unsubscribes: {
        Row: {
          category: string | null
          email_hash: string
          unsubscribed_at: string
        }
        Insert: {
          category?: string | null
          email_hash: string
          unsubscribed_at?: string
        }
        Update: {
          category?: string | null
          email_hash?: string
          unsubscribed_at?: string
        }
        Relationships: []
      }
      platform_communication_variants: {
        Row: {
          audience_type: string
          body_html: string
          body_plain: string | null
          communication_id: string
          id: string
          subject: string
        }
        Insert: {
          audience_type: string
          body_html: string
          body_plain?: string | null
          communication_id: string
          id?: string
          subject: string
        }
        Update: {
          audience_type?: string
          body_html?: string
          body_plain?: string | null
          communication_id?: string
          id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_communication_variants_communication_id_fkey"
            columns: ["communication_id"]
            isOneToOne: false
            referencedRelation: "platform_communications"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_communications: {
        Row: {
          created_at: string
          created_by_admin_id: string | null
          id: string
          scheduled_at: string | null
          sent_at: string | null
          source_reference: string | null
          source_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          source_reference?: string | null
          source_type?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_admin_id?: string | null
          id?: string
          scheduled_at?: string | null
          sent_at?: string | null
          source_reference?: string | null
          source_type?: string
          status?: string
          title?: string
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
          sponsor_account_id: string | null
          sponsor_library_item_id: string | null
          sponsor_resource_id: string | null
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
          sponsor_account_id?: string | null
          sponsor_library_item_id?: string | null
          sponsor_resource_id?: string | null
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
          sponsor_account_id?: string | null
          sponsor_library_item_id?: string | null
          sponsor_resource_id?: string | null
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
          {
            foreignKeyName: "resource_blocks_sponsor_account_id_fkey"
            columns: ["sponsor_account_id"]
            isOneToOne: false
            referencedRelation: "sponsor_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_blocks_sponsor_library_item_id_fkey"
            columns: ["sponsor_library_item_id"]
            isOneToOne: false
            referencedRelation: "sponsor_resource_library"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_blocks_sponsor_resource_id_fkey"
            columns: ["sponsor_resource_id"]
            isOneToOne: false
            referencedRelation: "sponsor_resources"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_library: {
        Row: {
          created_at: string
          default_sponsor_account_id: string | null
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
          default_sponsor_account_id?: string | null
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
          default_sponsor_account_id?: string | null
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
            foreignKeyName: "resource_library_default_sponsor_account_id_fkey"
            columns: ["default_sponsor_account_id"]
            isOneToOne: false
            referencedRelation: "sponsor_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_library_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_bookmarks: {
        Row: {
          created_at: string
          fanflet_id: string
          id: string
          phone_hash: string
        }
        Insert: {
          created_at?: string
          fanflet_id: string
          id?: string
          phone_hash: string
        }
        Update: {
          created_at?: string
          fanflet_id?: string
          id?: string
          phone_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_bookmarks_fanflet_id_fkey"
            columns: ["fanflet_id"]
            isOneToOne: false
            referencedRelation: "fanflets"
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
          deleted_at: string | null
          deleted_by: string | null
          demo_converted_at: string | null
          demo_created_by: string | null
          demo_environment_id: string | null
          demo_expires_at: string | null
          demo_prospect_email: string | null
          email: string
          id: string
          is_demo: boolean | null
          name: string
          photo_url: string | null
          slug: string | null
          social_links: Json | null
          status: string
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          demo_converted_at?: string | null
          demo_created_by?: string | null
          demo_environment_id?: string | null
          demo_expires_at?: string | null
          demo_prospect_email?: string | null
          email: string
          id?: string
          is_demo?: boolean | null
          name?: string
          photo_url?: string | null
          slug?: string | null
          social_links?: Json | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          bio?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          demo_converted_at?: string | null
          demo_created_by?: string | null
          demo_environment_id?: string | null
          demo_expires_at?: string | null
          demo_prospect_email?: string | null
          email?: string
          id?: string
          is_demo?: boolean | null
          name?: string
          photo_url?: string | null
          slug?: string | null
          social_links?: Json | null
          status?: string
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "speakers_demo_environment_id_fkey"
            columns: ["demo_environment_id"]
            isOneToOne: false
            referencedRelation: "demo_environments"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_accounts: {
        Row: {
          auth_user_id: string
          company_name: string
          contact_email: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          demo_created_by: string | null
          demo_environment_id: string | null
          description: string | null
          id: string
          industry: string | null
          is_demo: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          slug: string
          social_links: Json | null
          speaker_label: string
          timezone: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          auth_user_id: string
          company_name: string
          contact_email: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          demo_created_by?: string | null
          demo_environment_id?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          is_demo?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          slug: string
          social_links?: Json | null
          speaker_label?: string
          timezone?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          auth_user_id?: string
          company_name?: string
          contact_email?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          demo_created_by?: string | null
          demo_environment_id?: string | null
          description?: string | null
          id?: string
          industry?: string | null
          is_demo?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          slug?: string
          social_links?: Json | null
          speaker_label?: string
          timezone?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_accounts_demo_environment_id_fkey"
            columns: ["demo_environment_id"]
            isOneToOne: false
            referencedRelation: "demo_environments"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_campaign_kols: {
        Row: {
          added_at: string
          campaign_id: string
          speaker_id: string
        }
        Insert: {
          added_at?: string
          campaign_id: string
          speaker_id: string
        }
        Update: {
          added_at?: string
          campaign_id?: string
          speaker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_campaign_kols_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sponsor_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_campaign_kols_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_campaigns: {
        Row: {
          created_at: string
          crm_reference: Json | null
          description: string | null
          end_date: string | null
          id: string
          name: string
          sponsor_id: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          crm_reference?: Json | null
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          sponsor_id: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          crm_reference?: Json | null
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          sponsor_id?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_campaigns_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsor_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_connections: {
        Row: {
          created_at: string
          ended_at: string | null
          hidden_by_speaker: boolean | null
          hidden_by_sponsor: boolean | null
          id: string
          initiated_by: string
          message: string | null
          responded_at: string | null
          speaker_id: string
          sponsor_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          hidden_by_speaker?: boolean | null
          hidden_by_sponsor?: boolean | null
          id?: string
          initiated_by: string
          message?: string | null
          responded_at?: string | null
          speaker_id: string
          sponsor_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          hidden_by_speaker?: boolean | null
          hidden_by_sponsor?: boolean | null
          id?: string
          initiated_by?: string
          message?: string | null
          responded_at?: string | null
          speaker_id?: string
          sponsor_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_connections_speaker_id_fkey"
            columns: ["speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_connections_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsor_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_inquiries: {
        Row: {
          created_at: string
          details: string
          email: string
          id: string
          name: string
          notes: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details: string
          email: string
          id?: string
          name: string
          notes?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string
          email?: string
          id?: string
          name?: string
          notes?: string | null
          status?: string
        }
        Relationships: []
      }
      sponsor_leads: {
        Row: {
          created_at: string
          engagement_type: string
          fanflet_id: string
          id: string
          resource_block_id: string | null
          resource_title: string | null
          sponsor_id: string
          sponsor_resource_id: string | null
          subscriber_id: string
        }
        Insert: {
          created_at?: string
          engagement_type: string
          fanflet_id: string
          id?: string
          resource_block_id?: string | null
          resource_title?: string | null
          sponsor_id: string
          sponsor_resource_id?: string | null
          subscriber_id: string
        }
        Update: {
          created_at?: string
          engagement_type?: string
          fanflet_id?: string
          id?: string
          resource_block_id?: string | null
          resource_title?: string | null
          sponsor_id?: string
          sponsor_resource_id?: string | null
          subscriber_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_leads_fanflet_id_fkey"
            columns: ["fanflet_id"]
            isOneToOne: false
            referencedRelation: "fanflets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_leads_resource_block_id_fkey"
            columns: ["resource_block_id"]
            isOneToOne: false
            referencedRelation: "resource_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_leads_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsor_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_leads_sponsor_resource_id_fkey"
            columns: ["sponsor_resource_id"]
            isOneToOne: false
            referencedRelation: "sponsor_resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_leads_subscriber_id_fkey"
            columns: ["subscriber_id"]
            isOneToOne: false
            referencedRelation: "subscribers"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_plan_features: {
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
            foreignKeyName: "sponsor_plan_features_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_plan_features_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "sponsor_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_plans: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          is_public: boolean
          limits: Json
          name: string
          price_monthly_cents: number
          sort_order: number
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
          price_monthly_cents?: number
          sort_order?: number
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
          price_monthly_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      sponsor_report_tokens: {
        Row: {
          created_at: string
          created_by_speaker_id: string
          expires_at: string
          fanflet_id: string
          id: string
          sponsor_id: string
          token: string
        }
        Insert: {
          created_at?: string
          created_by_speaker_id: string
          expires_at: string
          fanflet_id: string
          id?: string
          sponsor_id: string
          token: string
        }
        Update: {
          created_at?: string
          created_by_speaker_id?: string
          expires_at?: string
          fanflet_id?: string
          id?: string
          sponsor_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_report_tokens_created_by_speaker_id_fkey"
            columns: ["created_by_speaker_id"]
            isOneToOne: false
            referencedRelation: "speakers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_report_tokens_fanflet_id_fkey"
            columns: ["fanflet_id"]
            isOneToOne: false
            referencedRelation: "fanflets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_report_tokens_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsor_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_resource_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          sponsor_id: string
          sponsor_resource_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          sponsor_id: string
          sponsor_resource_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          sponsor_id?: string
          sponsor_resource_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_resource_events_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsor_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_resource_events_sponsor_resource_id_fkey"
            columns: ["sponsor_resource_id"]
            isOneToOne: false
            referencedRelation: "sponsor_resource_library"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_resource_library: {
        Row: {
          availability: string
          available_to: string[] | null
          campaign_id: string | null
          created_at: string
          description: string | null
          file_path: string | null
          file_size_bytes: number | null
          file_type: string | null
          id: string
          image_url: string | null
          media_metadata: Json | null
          sponsor_id: string
          status: string
          title: string
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          availability?: string
          available_to?: string[] | null
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          image_url?: string | null
          media_metadata?: Json | null
          sponsor_id: string
          status?: string
          title: string
          type: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          availability?: string
          available_to?: string[] | null
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          file_type?: string | null
          id?: string
          image_url?: string | null
          media_metadata?: Json | null
          sponsor_id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_resource_library_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "sponsor_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_resource_library_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsor_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_resources: {
        Row: {
          created_at: string
          cta_text: string | null
          description: string | null
          expires_at: string | null
          file_path: string | null
          id: string
          image_url: string | null
          metadata: Json | null
          sponsor_id: string
          status: string
          title: string
          type: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          cta_text?: string | null
          description?: string | null
          expires_at?: string | null
          file_path?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          sponsor_id: string
          status?: string
          title: string
          type: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          cta_text?: string | null
          description?: string | null
          expires_at?: string | null
          file_path?: string | null
          id?: string
          image_url?: string | null
          metadata?: Json | null
          sponsor_id?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_resources_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: false
            referencedRelation: "sponsor_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sponsor_subscriptions: {
        Row: {
          created_at: string
          id: string
          limits_snapshot: Json | null
          plan_id: string
          sponsor_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          limits_snapshot?: Json | null
          plan_id: string
          sponsor_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          limits_snapshot?: Json | null
          plan_id?: string
          sponsor_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sponsor_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "sponsor_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sponsor_subscriptions_sponsor_id_fkey"
            columns: ["sponsor_id"]
            isOneToOne: true
            referencedRelation: "sponsor_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
          source_fanflet_id: string | null
          speaker_id: string
          sponsor_consent: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
          source_fanflet_id?: string | null
          speaker_id: string
          sponsor_consent?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          source_fanflet_id?: string | null
          speaker_id?: string
          sponsor_consent?: boolean
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
          invited_at: string | null
          invited_by: string | null
          removed_at: string | null
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
          invited_at?: string | null
          invited_by?: string | null
          removed_at?: string | null
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
          invited_at?: string | null
          invited_by?: string | null
          removed_at?: string | null
          role?: string
          scope_id?: string | null
          scope_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      worklog_archives: {
        Row: {
          archived_at: string
          archived_by_admin_id: string
          id: string
          worklog_filename: string
        }
        Insert: {
          archived_at?: string
          archived_by_admin_id: string
          id?: string
          worklog_filename: string
        }
        Update: {
          archived_at?: string
          archived_by_admin_id?: string
          id?: string
          worklog_filename?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_user_role: {
        Args: { new_role: string; target_user_id: string }
        Returns: undefined
      }
      is_platform_admin: { Args: never; Returns: boolean }
      record_sponsor_lead: {
        Args: {
          p_engagement_type: string
          p_resource_block_id: string
          p_subscriber_id: string
        }
        Returns: undefined
      }
      speaker_storage_used_bytes: {
        Args: { p_speaker_id: string }
        Returns: number
      }
      sponsor_storage_used_bytes: {
        Args: { p_sponsor_id: string }
        Returns: number
      }
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

