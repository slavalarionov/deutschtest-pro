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
          content: Json
          answers: Json | null
          audio_urls: Json | null
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          level: string
          mode: string
          session_flow?: string
          current_module?: string | null
          content: Json
          answers?: Json | null
          audio_urls?: Json | null
          created_at?: string
          expires_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          level?: string
          mode?: string
          content?: Json
          session_flow?: string
          current_module?: string | null
          answers?: Json | null
          audio_urls?: Json | null
          created_at?: string
          expires_at?: string
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
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          target_level?: string | null
          created_at?: string
          exams_taken?: number
          is_admin?: boolean
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          target_level?: string | null
          created_at?: string
          exams_taken?: number
          is_admin?: boolean
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
