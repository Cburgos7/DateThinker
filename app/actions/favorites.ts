import { createClient } from "@/utils/supabase/client"
import { getCurrentUser, getUserWithSubscription } from "@/lib/supabase"
import { addToFavorites, removeFromFavorites, isInFavorites } from "@/lib/favorites"
import type { PlaceResult } from "@/lib/search-utils"

export async function toggleFavorite(place: PlaceResult): Promise<{ success: boolean; isFavorite: boolean }> {
  const userWithSubscription = await getUserWithSubscription()

  if (!userWithSubscription) {
    return { success: false, isFavorite: false }
  }

  // Check if user has premium access
  if (userWithSubscription.subscription_status !== "premium" && userWithSubscription.subscription_status !== "lifetime") {
    return { success: false, isFavorite: false }
  }

  try {
    const isFavorite = await isInFavorites(userWithSubscription.id, place.id)

    if (isFavorite) {
      await removeFromFavorites(userWithSubscription.id, place.id)
      return { success: true, isFavorite: false }
    } else {
      await addToFavorites(userWithSubscription.id, place)
      return { success: true, isFavorite: true }
    }
  } catch (error) {
    console.error("Error toggling favorite:", error)
    return { success: false, isFavorite: false }
  }
}

export async function checkIsFavorite(placeId: string): Promise<boolean> {
  const user = await getCurrentUser()

  if (!user) {
    return false
  }

  try {
    return await isInFavorites(user.id, placeId)
  } catch (error) {
    console.error("Error checking favorite status:", error)
    return false
  }
}

export async function addToFavoritesAction(userId: string, placeId: string) {
  try {
    const supabase = createClient()
    
    // Check if the favorite already exists
    const { data: existingFavorite, error: checkError } = await supabase
      .from('favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('place_id', placeId)
      .maybeSingle()
    
    if (checkError) {
      console.error("Error checking for existing favorite:", checkError)
      return { success: false, error: checkError.message }
    }
    
    // If favorite already exists, return early
    if (existingFavorite) {
      return { success: true, data: existingFavorite }
    }
    
    // Otherwise, add the new favorite
    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        place_id: placeId,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error adding favorite:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error("Error in addToFavorites:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

export async function removeFromFavoritesAction(userId: string, placeId: string) {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('place_id', placeId)
    
    if (error) {
      console.error("Error removing favorite:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    console.error("Error removing favorite:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

