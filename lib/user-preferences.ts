import { createClient } from "@/utils/supabase/client"

export interface UserPreferences {
  interests: string[]
  activity_preferences: Record<string, boolean>
  dining_preferences: Record<string, boolean>
  location_preferences: Record<string, boolean>
  age_range: string
  relationship_status: string
  date_frequency: string
  budget_range: string
  default_city: string
  default_price_range: number
}

export const INTEREST_CATEGORIES = {
  restaurants: "Restaurants",
  activities: "Activities",
  drinks: "Drinks & Bars",
  outdoor: "Outdoor Activities",
  entertainment: "Entertainment",
  culture: "Arts & Culture",
  sports: "Sports",
  nightlife: "Nightlife",
  shopping: "Shopping",
  wellness: "Wellness & Spa",
  food_experiences: "Food Experiences",
  adventure: "Adventure",
  music: "Music & Concerts",
  art: "Art & Museums",
  history: "History & Heritage",
  nature: "Nature & Parks",
  fitness: "Fitness & Gym",
  technology: "Technology",
  learning: "Learning & Education",
  social_events: "Social Events"
}

export const ACTIVITY_PREFERENCES = {
  indoor: "Indoor Activities",
  outdoor: "Outdoor Activities",
  physical: "Physical Activities",
  relaxing: "Relaxing Activities",
  creative: "Creative Activities",
  social: "Social Activities",
  educational: "Educational Activities",
  adventurous: "Adventurous Activities"
}

export const DINING_PREFERENCES = {
  casual: "Casual Dining",
  fine_dining: "Fine Dining",
  ethnic_cuisine: "Ethnic Cuisine",
  vegetarian_friendly: "Vegetarian Friendly",
  vegan_friendly: "Vegan Friendly",
  cocktail_bars: "Cocktail Bars",
  wine_bars: "Wine Bars",
  breweries: "Breweries",
  coffee_shops: "Coffee Shops"
}

export const LOCATION_PREFERENCES = {
  city_center: "City Center",
  suburbs: "Suburbs",
  waterfront: "Waterfront",
  rooftop: "Rooftop",
  historic_areas: "Historic Areas",
  nightlife_districts: "Nightlife Districts",
  quiet_neighborhoods: "Quiet Neighborhoods",
  shopping_areas: "Shopping Areas"
}

export const AGE_RANGES = {
  "18-25": "18-25",
  "26-35": "26-35",
  "36-45": "36-45",
  "46-55": "46-55",
  "56-65": "56-65",
  "65+": "65+"
}

export const RELATIONSHIP_STATUSES = {
  single: "Single",
  in_relationship: "In a Relationship",
  married: "Married",
  divorced: "Divorced",
  widowed: "Widowed",
  complicated: "It's Complicated"
}

export const DATE_FREQUENCIES = {
  weekly: "Weekly",
  biweekly: "Bi-weekly",
  monthly: "Monthly",
  occasionally: "Occasionally",
  rarely: "Rarely",
  first_time: "First Time"
}

export const BUDGET_RANGES = {
  budget_conscious: "Budget Conscious ($)",
  moderate: "Moderate ($$)",
  comfortable: "Comfortable ($$$)",
  luxury: "Luxury ($$$$)",
  unlimited: "Unlimited"
}

/**
 * Get user preferences from the database
 */
export async function getUserPreferencesFromDB(userId: string): Promise<UserPreferences | null> {
  const supabase = createClient()
  
  try {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .single()

    if (error && error.code !== "PGRST116") {
      throw error
    }

    if (!data) return null

    return {
      interests: data.interests || [],
      activity_preferences: data.activity_preferences || {},
      dining_preferences: data.dining_preferences || {},
      location_preferences: data.location_preferences || {},
      age_range: data.age_range || "",
      relationship_status: data.relationship_status || "",
      date_frequency: data.date_frequency || "",
      budget_range: data.budget_range || "",
      default_city: data.default_city || "",
      default_price_range: data.default_price_range || 0
    }
  } catch (error) {
    console.error("Error fetching user preferences:", error)
    return null
  }
}

/**
 * Check if user has completed their basic preferences
 */
export function hasCompletedPreferences(preferences: UserPreferences | null): boolean {
  if (!preferences) return false
  
  return (
    preferences.interests.length > 0 &&
    preferences.age_range !== "" &&
    preferences.relationship_status !== "" &&
    preferences.date_frequency !== "" &&
    preferences.budget_range !== ""
  )
}

/**
 * Check if user has completed their detailed preferences
 */
export function hasDetailedPreferences(preferences: UserPreferences | null): boolean {
  if (!hasCompletedPreferences(preferences)) return false
  if (!preferences) return false
  
  const hasActivityPrefs = preferences.activity_preferences && 
    Object.values(preferences.activity_preferences).some(Boolean)
  const hasDiningPrefs = preferences.dining_preferences && 
    Object.values(preferences.dining_preferences).some(Boolean)
  const hasLocationPrefs = preferences.location_preferences && 
    Object.values(preferences.location_preferences).some(Boolean)
  
  return hasActivityPrefs || hasDiningPrefs || hasLocationPrefs
}

/**
 * Get user's primary interests as display names
 */
export function getDisplayInterests(preferences: UserPreferences | null): string[] {
  if (!preferences || !preferences.interests.length) return []
  
  return preferences.interests.map(interest => 
    INTEREST_CATEGORIES[interest as keyof typeof INTEREST_CATEGORIES] || interest
  )
}

/**
 * Get user's preferred budget range as display name
 */
export function getDisplayBudgetRange(preferences: UserPreferences | null): string {
  if (!preferences || !preferences.budget_range) return "Not specified"
  
  return BUDGET_RANGES[preferences.budget_range as keyof typeof BUDGET_RANGES] || preferences.budget_range
}

/**
 * Get user's preferred activity types based on their preferences
 */
export function getPreferredActivityTypes(preferences: UserPreferences | null): string[] {
  if (!preferences) return []
  
  const preferred = []
  
  // Add interests that are activity-related
  if (preferences.interests.includes('outdoor')) preferred.push('outdoor')
  if (preferences.interests.includes('activities')) preferred.push('activity')
  if (preferences.interests.includes('restaurants')) preferred.push('restaurant')
  if (preferences.interests.includes('drinks')) preferred.push('drink')
  
  // Add based on activity preferences
  if (preferences.activity_preferences.outdoor) preferred.push('outdoor')
  if (preferences.activity_preferences.social) preferred.push('activity')
  
  return [...new Set(preferred)] // Remove duplicates
}

/**
 * Score a place based on user preferences (0-100)
 */
export function scorePlace(place: any, preferences: UserPreferences | null): number {
  if (!preferences) return 50 // Neutral score
  
  let score = 50 // Base score
  
  // Interest matching
  if (preferences.interests.includes(place.category)) {
    score += 20
  }
  
  // Price matching
  if (preferences.default_price_range > 0 && place.price) {
    const priceDiff = Math.abs(preferences.default_price_range - place.price)
    if (priceDiff === 0) score += 15
    else if (priceDiff === 1) score += 10
    else if (priceDiff === 2) score += 5
    else score -= 5
  }
  
  // Activity preferences
  if (place.category === 'outdoor' && preferences.activity_preferences.outdoor) {
    score += 10
  }
  if (place.category === 'activity' && preferences.activity_preferences.social) {
    score += 10
  }
  
  // Dining preferences
  if (place.category === 'restaurant') {
    if (preferences.dining_preferences.casual && place.price <= 2) score += 10
    if (preferences.dining_preferences.fine_dining && place.price >= 3) score += 10
  }
  
  return Math.max(0, Math.min(100, score))
} 