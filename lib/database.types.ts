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
          updated_at: string
          user_id: string
          default_city: string | null
          default_filters: Json | null
          default_price_range: number | null
          interests: Json | null
          activity_preferences: Json | null
          dining_preferences: Json | null
          location_preferences: Json | null
          age_range: string | null
          relationship_status: string | null
          date_frequency: string | null
          budget_range: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          default_city?: string | null
          default_filters?: Json | null
          default_price_range?: number | null
          interests?: Json | null
          activity_preferences?: Json | null
          dining_preferences?: Json | null
          location_preferences?: Json | null
          age_range?: string | null
          relationship_status?: string | null
          date_frequency?: string | null
          budget_range?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          default_city?: string | null
          default_filters?: Json | null
          default_price_range?: number | null
          interests?: Json | null
          activity_preferences?: Json | null
          dining_preferences?: Json | null
          location_preferences?: Json | null
          age_range?: string | null
          relationship_status?: string | null
          date_frequency?: string | null
          budget_range?: string | null
        }
      }
      
      // New table for tracking shared date sets
      shared_date_sets: {
        Row: {
          id: string
          created_at: string
          date_set_id: string
          owner_id: string
          shared_with_id: string
          permission_level: "view" | "edit"
        }
        Insert: {
          id?: string
          created_at?: string
          date_set_id: string
          owner_id: string
          shared_with_id: string
          permission_level?: "view" | "edit"
        }
        Update: {
          id?: string
          created_at?: string
          date_set_id?: string
          owner_id?: string
          shared_with_id?: string
          permission_level?: "view" | "edit"
        }
      }
      
      // New table for reviews
      reviews: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          user_id: string
          date_set_id: string
          rating: number
          comment: string | null
          is_public: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id: string
          date_set_id: string
          rating: number
          comment?: string | null
          is_public?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          user_id?: string
          date_set_id?: string
          rating?: number
          comment?: string | null
          is_public?: boolean
        }
      }
      
      // New table for followers
      followers: {
        Row: {
          id: string
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          id?: string
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          id?: string
          created_at?: string
          follower_id?: string
          following_id?: string
        }
      }
    }
  }
}

