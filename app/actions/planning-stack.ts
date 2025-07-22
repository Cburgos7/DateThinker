import { createClient } from "@/utils/supabase/client"
import type { PlaceResult } from "@/lib/search-utils"

export interface PlanningStackItem {
  id: string
  venue_id: string
  venue_name: string
  venue_category: 'restaurant' | 'activity' | 'outdoor' | 'event'
  venue_address?: string
  venue_rating?: number
  venue_price_level?: number
  venue_photo_url?: string
  position: number
  scheduled_time?: string
  duration_minutes: number
  notes?: string
  is_favorite: boolean
  created_at: string
}

// Add venue to planning stack
export async function addToPlanningStack(venue: PlaceResult): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    if (!supabase) {
      return { success: false, error: "Supabase client not initialized" }
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    // Get the next position
    const { data: maxPosition, error: positionError } = await supabase
      .from('planning_stack')
      .select('position')
      .eq('user_id', user.id)
      .order('position', { ascending: false })
      .limit(1)
      .single()

    if (positionError && positionError.code !== 'PGRST116') {
      console.error("Error getting max position:", positionError)
    }

    const nextPosition = (maxPosition?.position || 0) + 1

    // Check if venue already exists in stack (use ILIKE for case-insensitive matching)
    const { data: existing, error: checkError } = await supabase
      .from('planning_stack')
      .select('id')
      .eq('user_id', user.id)
      .ilike('venue_id', venue.id)

    if (checkError) {
      console.error("Error checking existing venue:", checkError)
    }

    if (existing && existing.length > 0) {
      return { success: false, error: "Venue already in planning stack" }
    }

    // Add to planning stack
    const { error: insertError } = await supabase.from('planning_stack').insert({
      user_id: user.id,
      venue_id: venue.id,
      venue_name: venue.name,
      venue_category: venue.category,
      venue_address: venue.address,
      venue_rating: venue.rating,
      venue_price_level: venue.price,
      venue_photo_url: venue.photoUrl,
      position: nextPosition,
      duration_minutes: getDefaultDuration(venue.category),
      is_favorite: false
    })

    if (insertError) {
      console.error("Error inserting into planning stack:", insertError)
      throw insertError
    }

    return { success: true }
  } catch (error) {
    console.error("Error adding to planning stack:", error)
    return { success: false, error: "Failed to add to planning stack" }
  }
}

// Get user's planning stack
export async function getPlanningStack(): Promise<PlanningStackItem[]> {
  try {
    const supabase = createClient()
    
    if (!supabase) {
      return []
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return []
    }

    const { data, error } = await supabase
      .from('planning_stack')
      .select('*')
      .eq('user_id', user.id)
      .order('position', { ascending: true })

    if (error) {
      console.error("Error getting planning stack:", error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error("Error getting planning stack:", error)
    return []
  }
}

// Remove item from planning stack
export async function removeFromPlanningStack(itemId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    if (!supabase) {
      return { success: false, error: "Supabase client not initialized" }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const { error } = await supabase
      .from('planning_stack')
      .delete()
      .eq('id', itemId)
      .eq('user_id', user.id)

    if (error) throw error

    // Reorder remaining items
    await reorderPlanningStack(user.id)

    return { success: true }
  } catch (error) {
    console.error("Error removing from planning stack:", error)
    return { success: false, error: "Failed to remove from planning stack" }
  }
}

// Reorder planning stack after deletions
async function reorderPlanningStack(userId: string): Promise<void> {
  try {
    const supabase = createClient()
    if (!supabase) return

    const { data: items } = await supabase
      .from('planning_stack')
      .select('id')
      .eq('user_id', userId)
      .order('position', { ascending: true })

    if (!items) return

    // Update positions to be sequential
    for (let i = 0; i < items.length; i++) {
      await supabase
        .from('planning_stack')
        .update({ position: i + 1 })
        .eq('id', items[i].id)
    }
  } catch (error) {
    console.error("Error reordering planning stack:", error)
  }
}

// Update planning stack item
export async function updatePlanningStackItem(
  itemId: string, 
  updates: Partial<Pick<PlanningStackItem, 'scheduled_time' | 'duration_minutes' | 'notes' | 'position'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    if (!supabase) {
      return { success: false, error: "Supabase client not initialized" }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const { error } = await supabase
      .from('planning_stack')
      .update(updates)
      .eq('id', itemId)
      .eq('user_id', user.id)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error updating planning stack item:", error)
    return { success: false, error: "Failed to update planning stack item" }
  }
}

// Clear entire planning stack
export async function clearPlanningStack(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    if (!supabase) {
      return { success: false, error: "Supabase client not initialized" }
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: "User not authenticated" }
    }

    const { error } = await supabase
      .from('planning_stack')
      .delete()
      .eq('user_id', user.id)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error("Error clearing planning stack:", error)
    return { success: false, error: "Failed to clear planning stack" }
  }
}

// Get default duration for venue category
function getDefaultDuration(category: string): number {
  switch (category) {
    case 'restaurant':
      return 90 // 1.5 hours
    case 'activity':
      return 120 // 2 hours
    case 'outdoor':
      return 180 // 3 hours
    case 'event':
      return 240 // 4 hours
    default:
      return 120 // 2 hours
  }
} 