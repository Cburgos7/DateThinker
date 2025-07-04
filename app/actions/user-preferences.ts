"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export interface UserInterests {
  interests: string[]
  activity_preferences: {
    indoor: boolean
    outdoor: boolean
    physical: boolean
    relaxing: boolean
    creative: boolean
    social: boolean
    educational: boolean
    adventurous: boolean
  }
  dining_preferences: {
    casual: boolean
    fine_dining: boolean
    ethnic_cuisine: boolean
    vegetarian_friendly: boolean
    vegan_friendly: boolean
    cocktail_bars: boolean
    wine_bars: boolean
    breweries: boolean
    coffee_shops: boolean
  }
  location_preferences: {
    city_center: boolean
    suburbs: boolean
    waterfront: boolean
    rooftop: boolean
    historic_areas: boolean
    nightlife_districts: boolean
    quiet_neighborhoods: boolean
    shopping_areas: boolean
  }
  age_range: string
  relationship_status: string
  date_frequency: string
  budget_range: string
  default_city: string
  default_price_range: number
}

export async function getUserPreferences(userId: string) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error && error.code !== "PGRST116") { // PGRST116 is "no rows returned"
      throw error
    }

    return data
  } catch (error) {
    console.error("Error fetching user preferences:", error)
    return null
  }
}

export async function updateUserPreferences(userId: string, preferences: Partial<UserInterests>) {
  const supabase = createClient()

  try {
    // Get current user to ensure they're authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user || user.id !== userId) {
      throw new Error("Unauthorized")
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .upsert({
        user_id: userId,
        interests: preferences.interests || [],
        activity_preferences: preferences.activity_preferences || {},
        dining_preferences: preferences.dining_preferences || {},
        location_preferences: preferences.location_preferences || {},
        age_range: preferences.age_range || null,
        relationship_status: preferences.relationship_status || null,
        date_frequency: preferences.date_frequency || null,
        budget_range: preferences.budget_range || null,
        default_city: preferences.default_city || null,
        default_price_range: preferences.default_price_range || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    revalidatePath("/settings")
    return { success: true, data }
  } catch (error) {
    console.error("Error updating user preferences:", error)
    return { success: false, error: error instanceof Error ? error.message : "Unknown error occurred" }
  }
}

export async function getInterestCategories() {
  return [
    "restaurants",
    "activities", 
    "drinks",
    "outdoor",
    "entertainment",
    "culture",
    "sports",
    "nightlife",
    "shopping",
    "wellness",
    "food_experiences",
    "adventure",
    "music",
    "art",
    "history",
    "nature",
    "fitness",
    "technology",
    "learning",
    "social_events"
  ]
}

export async function getAgeRanges() {
  return [
    "18-25",
    "26-35", 
    "36-45",
    "46-55",
    "56-65",
    "65+"
  ]
}

export async function getRelationshipStatuses() {
  return [
    "single",
    "in_relationship",
    "married",
    "divorced",
    "widowed",
    "complicated"
  ]
}

export async function getDateFrequencies() {
  return [
    "weekly",
    "biweekly",
    "monthly",
    "occasionally",
    "rarely",
    "first_time"
  ]
}

export async function getBudgetRanges() {
  return [
    "budget_conscious",
    "moderate",
    "comfortable",
    "luxury",
    "unlimited"
  ]
} 