import { createClient } from "@/utils/supabase/client"
import type { PlaceResult } from "@/lib/search-utils"

// Add a place to user's favorites
export async function addToFavorites(userId: string, place: PlaceResult): Promise<boolean> {
  try {
    const supabase = createClient()
    
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return false
    }

    // Ensure we have a valid place_id - use place.id or place.placeId or generate a fallback
    const placeId = place.id || place.placeId || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    if (!placeId) {
      console.error("No valid place_id found for favorite")
      return false
    }

    console.log("Adding to favorites with place_id:", placeId, "for place:", place.name, "category:", place.category)

    const { error } = await supabase.from("favorites").insert({
      user_id: userId,
      place_id: placeId,
      name: place.name || 'Unknown Place',
      category: place.category || 'activity', // Now 'event' is allowed
      address: place.address || '',
      rating: place.rating || 0,
      price: place.price || 0,
      photo_url: place.photoUrl || null,
    } as any)

    if (error) {
      console.error("Supabase error adding to favorites:", error)
      throw error
    }

    console.log("Successfully added to favorites:", place.name)
    return true
  } catch (error) {
    console.error("Error adding to favorites:", error)
    return false
  }
}

// Remove a place from user's favorites
export async function removeFromFavorites(userId: string, placeId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return false
    }

    // First get the IDs of favorites that match our criteria
    const { data, error: findError } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId as any)
      .like("place_id", `%${placeId}%` as any)

    if (findError) {
      console.error("Error finding favorites to delete:", findError)
      return false
    }

    if (!data || data.length === 0) {
      // No matching favorites found
      return true
    }

    // Delete each matching favorite by its ID
    for (const item of data) {
      const { error: deleteError } = await supabase
        .from("favorites")
        .delete()
        .eq("id", (item as any).id as any)

      if (deleteError) {
        console.error(`Error deleting favorite with ID ${(item as any).id}:`, deleteError)
        return false
      }
    }

    return true
  } catch (error) {
    console.error("Error removing from favorites:", error)
    return false
  }
}

// Get all favorites for a user
export async function getUserFavorites(userId: string): Promise<PlaceResult[]> {
  try {
    const supabase = createClient()
    
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return []
    }

    const { data, error } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", userId as any)
      .order("created_at", { ascending: false })

    if (error) throw error

    return (data as any[]).map((item) => ({
      id: item.place_id,
      name: item.name,
      category: item.category,
      address: item.address,
      rating: item.rating,
      price: item.price,
      photoUrl: item.photo_url,
      isOutdoor: item.category === "outdoor",
      openNow: undefined, // We don't store this in favorites
    }))
  } catch (error) {
    console.error("Error getting user favorites:", error)
    return []
  }
}

// Check if a place is in user's favorites
export async function isInFavorites(userId: string, placeId: string): Promise<boolean> {
  try {
    const supabase = createClient()
    
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return false
    }

    // Use a LIKE query to find matching place_id
    const { data, error } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId as any)
      .like("place_id", `%${placeId}%` as any)

    if (error) {
      console.error("Database error checking favorites:", error)
      return false
    }

    return data && data.length > 0
  } catch (error) {
    console.error("Error checking favorites:", error)
    return false
  }
}

