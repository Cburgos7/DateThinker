"use server"

import { getCurrentUser } from "@/lib/supabase"
import { addToFavorites, removeFromFavorites, isInFavorites } from "@/lib/favorites"
import type { PlaceResult } from "@/lib/search-utils"

export async function toggleFavorite(place: PlaceResult): Promise<{ success: boolean; isFavorite: boolean }> {
  const user = await getCurrentUser()

  if (!user) {
    return { success: false, isFavorite: false }
  }

  // Check if user has premium access
  if (user.subscription_status !== "premium" && user.subscription_status !== "lifetime") {
    return { success: false, isFavorite: false }
  }

  try {
    const isFavorite = await isInFavorites(user.id, place.id)

    if (isFavorite) {
      await removeFromFavorites(user.id, place.id)
      return { success: true, isFavorite: false }
    } else {
      await addToFavorites(user.id, place)
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

