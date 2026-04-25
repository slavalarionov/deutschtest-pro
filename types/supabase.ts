export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      exam_sessions: {
        Row: {
          id: string
          user_id: string
          level: string
          mode: string
          session_flow: string
          current_module: string | null
          completed_modules: string
          content: Json
          answers: Json | null
          audio_urls: Json | null
          created_at: string
          expires_at: string
          retake_of: string | null
          retake_module: string | null
          public_id: string | null
          is_public: boolean
        }
        Insert: {
          id?: string
          user_id: string
          level: string
          mode: string
          session_flow?: string
          current_module?: string | null
          completed_modules?: string
          content: Json
          answers?: Json | null
          audio_urls?: Json | null
          created_at?: string
          expires_at?: string
          retake_of?: string | null
          retake_module?: string | null
          public_id?: string | null
          is_public?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          level?: string
          mode?: string
          content?: Json
          session_flow?: string
          current_module?: string | null
          completed_modules?: string
          answers?: Json | null
          audio_urls?: Json | null
          created_at?: string
          expires_at?: string
          retake_of?: string | null
          retake_module?: string | null
          public_id?: string | null
          is_public?: boolean
        }
        Relationships: []
      }
      user_attempts: {
        Row: {
          id: string
          user_id: string
          session_id: string
          level: string
          started_at: string
          submitted_at: string | null
          scores: Json | null
          ai_feedback: Json | null
          user_input: Json | null
          is_free_test: boolean
          payment_status: 'free' | 'paid' | 'pending'
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          level: string
          started_at?: string
          submitted_at?: string | null
          scores?: Json | null
          ai_feedback?: Json | null
          user_input?: Json | null
          is_free_test?: boolean
          payment_status?: 'free' | 'paid' | 'pending'
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          level?: string
          started_at?: string
          submitted_at?: string | null
          scores?: Json | null
          ai_feedback?: Json | null
          user_input?: Json | null
          is_free_test?: boolean
          payment_status?: 'free' | 'paid' | 'pending'
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          target_level: string | null
          created_at: string
          exams_taken: number
          is_admin: boolean
          modules_balance: number
          is_unlimited: boolean
          is_blocked: boolean
          cached_recommendations: Json | null
          recommendations_attempts_count: number | null
          recommendations_generated_at: string | null
          display_name: string | null
          preferred_language: 'de' | 'ru' | 'en' | 'tr'
          cached_recommendations_language: 'de' | 'ru' | 'en' | 'tr' | null
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          target_level?: string | null
          created_at?: string
          exams_taken?: number
          is_admin?: boolean
          modules_balance?: number
          is_unlimited?: boolean
          is_blocked?: boolean
          cached_recommendations?: Json | null
          recommendations_attempts_count?: number | null
          recommendations_generated_at?: string | null
          display_name?: string | null
          preferred_language?: 'de' | 'ru' | 'en' | 'tr'
          cached_recommendations_language?: 'de' | 'ru' | 'en' | 'tr' | null
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          target_level?: string | null
          created_at?: string
          exams_taken?: number
          is_admin?: boolean
          modules_balance?: number
          is_unlimited?: boolean
          is_blocked?: boolean
          cached_recommendations?: Json | null
          recommendations_attempts_count?: number | null
          recommendations_generated_at?: string | null
          display_name?: string | null
          preferred_language?: 'de' | 'ru' | 'en' | 'tr'
          cached_recommendations_language?: 'de' | 'ru' | 'en' | 'tr' | null
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          id: number
          user_id: string | null
          session_id: string | null
          provider: string
          model: string
          operation: string
          input_tokens: number | null
          output_tokens: number | null
          audio_seconds: number | null
          characters: number | null
          cost_usd: number
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string | null
          session_id?: string | null
          provider: string
          model: string
          operation: string
          input_tokens?: number | null
          output_tokens?: number | null
          audio_seconds?: number | null
          characters?: number | null
          cost_usd: number
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string | null
          session_id?: string | null
          provider?: string
          model?: string
          operation?: string
          input_tokens?: number | null
          output_tokens?: number | null
          audio_seconds?: number | null
          characters?: number | null
          cost_usd?: number
          metadata?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          key: string
          category: string
          active_version_id: number | null
          description: string | null
          updated_at: string
        }
        Insert: {
          key: string
          category: string
          active_version_id?: number | null
          description?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          category?: string
          active_version_id?: number | null
          description?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prompt_versions: {
        Row: {
          id: number
          prompt_key: string
          version: number
          content: string
          changed_by: string | null
          change_note: string | null
          created_at: string
        }
        Insert: {
          id?: number
          prompt_key: string
          version: number
          content: string
          changed_by?: string | null
          change_note?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          prompt_key?: string
          version?: number
          content?: string
          changed_by?: string | null
          change_note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          id: string
          code: string
          modules_reward: number
          max_redemptions: number | null
          current_redemptions: number
          valid_until: string | null
          one_per_user: boolean
          is_active: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          code: string
          modules_reward: number
          max_redemptions?: number | null
          current_redemptions?: number
          valid_until?: string | null
          one_per_user?: boolean
          is_active?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          code?: string
          modules_reward?: number
          max_redemptions?: number | null
          current_redemptions?: number
          valid_until?: string | null
          one_per_user?: boolean
          is_active?: boolean
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          id: number
          promo_id: string
          user_id: string
          modules_granted: number
          redeemed_at: string
        }
        Insert: {
          id?: number
          promo_id: string
          user_id: string
          modules_granted: number
          redeemed_at?: string
        }
        Update: {
          id?: number
          promo_id?: string
          user_id?: string
          modules_granted?: number
          redeemed_at?: string
        }
        Relationships: []
      }
      modules_ledger: {
        Row: {
          id: number
          user_id: string
          delta: number
          reason: string
          related_attempt_id: string | null
          related_promo_id: string | null
          performed_by: string | null
          note: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id: string
          delta: number
          reason: string
          related_attempt_id?: string | null
          related_promo_id?: string | null
          performed_by?: string | null
          note?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          delta?: number
          reason?: string
          related_attempt_id?: string | null
          related_promo_id?: string | null
          performed_by?: string | null
          note?: string | null
          created_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          id: number
          user_id: string | null
          attempt_id: string | null
          rating: number | null
          message: string | null
          created_at: string
        }
        Insert: {
          id?: number
          user_id?: string | null
          attempt_id?: string | null
          rating?: number | null
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          user_id?: string | null
          attempt_id?: string | null
          rating?: number | null
          message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      deleted_users_audit: {
        Row: {
          id: number
          deleted_at: string
          deleted_by: string | null
          user_id: string
          email: string | null
          display_name: string | null
          modules_balance_at_delete: number | null
          attempts_count_at_delete: number | null
          was_admin: boolean | null
          was_unlimited: boolean | null
          note: string | null
        }
        Insert: {
          id?: number
          deleted_at?: string
          deleted_by?: string | null
          user_id: string
          email?: string | null
          display_name?: string | null
          modules_balance_at_delete?: number | null
          attempts_count_at_delete?: number | null
          was_admin?: boolean | null
          was_unlimited?: boolean | null
          note?: string | null
        }
        Update: {
          id?: number
          deleted_at?: string
          deleted_by?: string | null
          user_id?: string
          email?: string | null
          display_name?: string | null
          modules_balance_at_delete?: number | null
          attempts_count_at_delete?: number | null
          was_admin?: boolean | null
          was_unlimited?: boolean | null
          note?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
