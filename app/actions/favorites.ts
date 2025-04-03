"use server"

import { getCurrentUser } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import { addToFavorites, removeFromFavorites, isInFavorites } from "@/lib/favorites"
import type { PlaceResult } from "@/app/actions"

export async function toggleFavorite(place: any): Promise<{ success: boolean; isFavorite: boolean }> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, isFavorite: false }
    }

    // Check if user has premium access
    if (user.subscription_status === "free") {
      return { success: false, isFavorite: false }
    }

    // Check if place is already favorited
    const { data: existingFavorite } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("place_id", place.id)
      .single()

    if (existingFavorite) {
      // Remove from favorites
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", existingFavorite.id)

      if (error) {
        console.error("Error removing favorite:", error)
        return { success: false, isFavorite: false }
      }

      return { success: true, isFavorite: false }
    } else {
      // Add to favorites
      const { error } = await supabase.from("favorites").insert({
        user_id: user.id,
        place_id: place.id,
        place_data: place,
      })

      if (error) {
        console.error("Error adding favorite:", error)
        return { success: false, isFavorite: false }
      }

      return { success: true, isFavorite: true }
    }
  } catch (error) {
    console.error("Error toggling favorite:", error)
    return { success: false, isFavorite: false }
  }
}

export async function checkIsFavorite(placeId: string): Promise<boolean> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return false
    }

    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("place_id", placeId)
      .single()

    return !!data
  } catch (error) {
    console.error("Error checking favorite:", error)
    return false
  }
}

// Add this new server action for removing favorites
export async function removeFromFavoritesAction(userId: string, placeId: string) {
  "use server"

  try {
    await removeFromFavorites(userId, placeId)
    return { success: true }
  } catch (error) {
    console.error("Error removing favorite:", error)
    return { success: false }
  }
}

