import { supabase } from "./supabase"
import type { PlaceResult } from "@/app/actions"

// Add a place to user's favorites
export async function addToFavorites(userId: string, place: PlaceResult): Promise<boolean> {
  try {
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return false
    }

    const { error } = await supabase.from("favorites").insert({
      user_id: userId,
      place_id: place.id,
      name: place.name,
      category: place.category,
      address: place.address,
      rating: place.rating,
      price: place.price,
      photo_url: place.photoUrl,
    })

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error adding to favorites:", error)
    return false
  }
}

// Remove a place from user's favorites
export async function removeFromFavorites(userId: string, placeId: string): Promise<boolean> {
  try {
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return false
    }

    // First get the IDs of favorites that match our criteria
    const { data, error: findError } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .like("place_id", `%${placeId}%`)

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
      const { error: deleteError } = await supabase.from("favorites").delete().eq("id", item.id)

      if (deleteError) {
        console.error(`Error deleting favorite with ID ${item.id}:`, deleteError)
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
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return []
    }

    const { data, error } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) throw error

    return data.map((item) => ({
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
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return false
    }

    // Use a LIKE query to find matching place_id
    const { data, error } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", userId)
      .like("place_id", `%${placeId}%`)

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

