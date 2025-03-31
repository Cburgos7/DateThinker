export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          full_name: string | null
          avatar_url: string | null
          subscription_status: "free" | "premium" | "lifetime"
          subscription_expiry: string | null
          stripe_customer_id: string | null
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_status?: "free" | "premium" | "lifetime"
          subscription_expiry?: string | null
          stripe_customer_id?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          full_name?: string | null
          avatar_url?: string | null
          subscription_status?: "free" | "premium" | "lifetime"
          subscription_expiry?: string | null
          stripe_customer_id?: string | null
        }
      }
      favorites: {
        Row: {
          id: string
          created_at: string
          user_id: string
          place_id: string
          name: string
          category: "restaurant" | "activity" | "drink" | "outdoor"
          address: string
          rating: number
          price: number
          photo_url: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          place_id: string
          name: string
          category: "restaurant" | "activity" | "drink" | "outdoor"
          address: string
          rating: number
          price: number
          photo_url?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          place_id?: string
          name?: string
          category?: "restaurant" | "activity" | "drink" | "outdoor"
          address?: string
          rating?: number
          price?: number
          photo_url?: string | null
        }
      }
      date_sets: {
        Row: {
          id: string
          created_at: string
          user_id: string
          title: string
          date: string
          start_time: string
          end_time: string
          places: Json[]
          share_id: string
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          title: string
          date: string
          start_time: string
          end_time: string
          places: Json[]
          share_id?: string
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          title?: string
          date?: string
          start_time?: string
          end_time?: string
          places?: Json[]
          share_id?: string
          notes?: string | null
        }
      }
      user_preferences: {
        Row: {
          id: string
          created_at: string
          user_id: string
          default_city: string | null
          default_filters: Json | null
          default_price_range: number | null
        }
        Insert: {
          id?: string
          created_at?: string
          user_id: string
          default_city?: string | null
          default_filters?: Json | null
          default_price_range?: number | null
        }
        Update: {
          id?: string
          created_at?: string
          user_id?: string
          default_city?: string | null
          default_filters?: Json | null
          default_price_range?: number | null
        }
      }
    }
  }
}

