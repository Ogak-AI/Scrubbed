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
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          user_type: 'dumper' | 'collector' | 'admin'
          phone: string | null
          address: string | null
          email_verified: boolean
          phone_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          user_type: 'dumper' | 'collector' | 'admin'
          phone?: string | null
          address?: string | null
          email_verified?: boolean
          phone_verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          user_type?: 'dumper' | 'collector' | 'admin'
          phone?: string | null
          address?: string | null
          email_verified?: boolean
          phone_verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      collectors: {
        Row: {
          id: string
          profile_id: string
          specializations: string[]
          service_radius: number
          is_available: boolean
          current_location: Json | null
          rating: number | null
          total_collections: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          specializations?: string[]
          service_radius?: number
          is_available?: boolean
          current_location?: Json | null
          rating?: number | null
          total_collections?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          specializations?: string[]
          service_radius?: number
          is_available?: boolean
          current_location?: Json | null
          rating?: number | null
          total_collections?: number
          created_at?: string
          updated_at?: string
        }
      }
      waste_requests: {
        Row: {
          id: string
          dumper_id: string
          collector_id: string | null
          waste_type: string
          description: string | null
          location: Json
          address: string
          status: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_time: string | null
          estimated_amount: string | null
          price: number | null
          photos: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          dumper_id: string
          collector_id?: string | null
          waste_type: string
          description?: string | null
          location: Json
          address: string
          status?: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_time?: string | null
          estimated_amount?: string | null
          price?: number | null
          photos?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          dumper_id?: string
          collector_id?: string | null
          waste_type?: string
          description?: string | null
          location?: Json
          address?: string
          status?: 'pending' | 'matched' | 'in_progress' | 'completed' | 'cancelled'
          scheduled_time?: string | null
          estimated_amount?: string | null
          price?: number | null
          photos?: string[] | null
          created_at?: string
          updated_at?: string
        }
      }
      phone_verifications: {
        Row: {
          id: string
          user_id: string
          phone: string
          code: string
          verified: boolean
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          phone: string
          code: string
          verified?: boolean
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          phone?: string
          code?: string
          verified?: boolean
          expires_at?: string
          created_at?: string
        }
      }
      chat_conversations: {
        Row: {
          id: string
          request_id: string
          dumper_id: string
          collector_id: string
          last_message: string | null
          last_message_at: string | null
          dumper_unread_count: number
          collector_unread_count: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          request_id: string
          dumper_id: string
          collector_id: string
          last_message?: string | null
          last_message_at?: string | null
          dumper_unread_count?: number
          collector_unread_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          request_id?: string
          dumper_id?: string
          collector_id?: string
          last_message?: string | null
          last_message_at?: string | null
          dumper_unread_count?: number
          collector_unread_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          conversation_id: string
          request_id: string
          sender_id: string
          sender_type: 'dumper' | 'collector'
          message: string
          message_type: 'text' | 'image' | 'location'
          metadata: Json | null
          is_read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          request_id: string
          sender_id: string
          sender_type: 'dumper' | 'collector'
          message: string
          message_type?: 'text' | 'image' | 'location'
          metadata?: Json | null
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          request_id?: string
          sender_id?: string
          sender_type?: 'dumper' | 'collector'
          message?: string
          message_type?: 'text' | 'image' | 'location'
          metadata?: Json | null
          is_read?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}