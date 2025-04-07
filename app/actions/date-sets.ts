"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import {
  createDateSet,
  getUserDateSets,
  getDateSetById,
  deleteDateSet,
  getDateSetByShareId,
  generateICalEvent,
  generateGoogleCalendarLink,
  type DateSet,
} from "@/lib/date-sets"
import type { PlaceResult } from "@/lib/search-utils"
import { storeMockDateSet } from "@/app/actions/date-plans"
import { getCurrentUser } from '@/lib/supabase'

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development'

export async function saveDateSetAction(
  title: string,
  date: string,
  startTime: string,
  endTime: string,
  places: PlaceResult[],
  notes?: string
) {
  try {
    // Get the current user session
    const user = await getCurrentUser()
    
    // In development mode, use a test user ID if no session is found
    const userId = user?.id || (process.env.NODE_ENV === 'development' ? "test-user-id" : null)
    
    if (!userId) {
      return { success: false, error: "User not authenticated" }
    }
    
    // Create the date set
    const dateSetId = await createDateSet(
      userId,
      title,
      date,
      startTime,
      endTime,
      places,
      notes
    )
    
    if (!dateSetId) {
      return { success: false, error: "Failed to create date set" }
    }
    
    // In development mode, store the mock date set for later retrieval
    if (process.env.NODE_ENV === 'development' && userId === "test-user-id") {
      const mockDateSet: DateSet = {
        id: dateSetId,
        title,
        date,
        start_time: startTime,
        end_time: endTime,
        places,
        share_id: `mock-share-${Date.now()}`,
        notes: notes || null,
        created_at: new Date().toISOString(),
        user_id: userId
      };
      
      await storeMockDateSet(mockDateSet);
    }
    
    return { success: true, dateSetId }
  } catch (error) {
    console.error("Error saving date set:", error)
    return { success: false, error: "Failed to save date set" }
  }
}

export async function getUserDateSetsAction() {
  try {
    // Get the current user session
    const user = await getCurrentUser()
    
    // In development mode, use a test user ID if no session is found
    const userId = user?.id || (process.env.NODE_ENV === 'development' ? "test-user-id" : null)
    
    if (!userId) {
      return { success: false, error: "User not authenticated" }
    }
    
    // Get the user's date sets
    const dateSets = await getUserDateSets(userId)
    
    return { success: true, dateSets }
  } catch (error) {
    console.error("Error getting user date sets:", error)
    return { success: false, error: "Failed to get date sets" }
  }
}

export async function deleteDateSetAction(dateSetId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Create a server action client
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession()
    
    // In development mode, if no session is found, use a default user ID
    // This is only for testing purposes and should not be used in production
    let userId: string;
    
    if (!session) {
      if (isDevelopment) {
        console.log("Development mode: Using default user ID for testing");
        // Use a default user ID for testing in development
        userId = "test-user-id";
      } else {
        return { success: false, error: "You must be logged in to delete a date set" }
      }
    } else {
      userId = session.user.id;
    }

    // Verify the date set belongs to the user
    const dateSet = await getDateSetById(dateSetId)
    if (!dateSet) {
      return { success: false, error: "Date set not found" }
    }

    if (dateSet.user_id !== userId) {
      return { success: false, error: "You don't have permission to delete this date set" }
    }

    await deleteDateSet(dateSetId, userId)
    return { success: true }
  } catch (error) {
    console.error("Error deleting date set:", error)
    return { success: false, error: "Failed to delete date set" }
  }
}

export async function getDateSetByIdAction(
  id: string,
): Promise<{ success: boolean; dateSet?: DateSet; error?: string }> {
  try {
    const dateSet = await getDateSetById(id)

    if (!dateSet) {
      return { success: false, error: "Date set not found" }
    }

    return { success: true, dateSet }
  } catch (error) {
    console.error("Error getting date set:", error)
    return { success: false, error: "Failed to retrieve date set" }
  }
}

export async function getSharedDateSetAction(
  shareId: string,
): Promise<{ success: boolean; dateSet?: DateSet; error?: string }> {
  try {
    const dateSet = await getDateSetByShareId(shareId)

    if (!dateSet) {
      return { success: false, error: "Shared date set not found" }
    }

    return { success: true, dateSet }
  } catch (error) {
    console.error("Error getting shared date set:", error)
    return { success: false, error: "Failed to retrieve shared date set" }
  }
}

export async function generateCalendarFileAction(
  dateSetId: string,
): Promise<{ success: boolean; icalContent?: string; error?: string }> {
  try {
    // Create a server action client
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })
    
    // Get the current user
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return { success: false, error: "You must be logged in to export a calendar" }
    }
    
    const userId = session.user.id

    const dateSet = await getDateSetById(dateSetId)

    if (!dateSet) {
      return { success: false, error: "Date set not found" }
    }

    // Verify ownership
    if (dateSet.user_id !== userId) {
      return { success: false, error: "You don't have permission to export this date set" }
    }

    const icalContent = generateICalEvent(dateSet)
    return { success: true, icalContent }
  } catch (error) {
    console.error("Error generating calendar file:", error)
    return { success: false, error: "Failed to generate calendar file" }
  }
}

export async function getGoogleCalendarLinkAction(
  dateSetId: string,
): Promise<{ success: boolean; link?: string; error?: string }> {
  try {
    const dateSet = await getDateSetById(dateSetId)

    if (!dateSet) {
      return { success: false, error: "Date set not found" }
    }

    const link = generateGoogleCalendarLink(dateSet)
    return { success: true, link }
  } catch (error) {
    console.error("Error generating Google Calendar link:", error)
    return { success: false, error: "Failed to generate Google Calendar link" }
  }
}

/**
 * Update an existing date set
 */
export async function updateDateSetAction(
  id: string,
  title: string,
  date: string,
  startTime: string,
  endTime: string,
  places: PlaceResult[],
  notes?: string
) {
  try {
    // Get the current user session
    const user = await getCurrentUser()
    
    // In development mode, use a test user ID if no session is found
    const userId = user?.id || (process.env.NODE_ENV === 'development' ? "test-user-id" : null)
    
    if (!userId) {
      return { success: false, error: "User not authenticated" }
    }
    
    // Update the date set
    const success = await updateDateSet(id, userId, title, date, startTime, endTime, places, notes)
    
    if (!success) {
      return { success: false, error: "Failed to update date set" }
    }
    
    // Get the updated date set
    const dateSet = await getDateSetById(id)
    
    if (!dateSet) {
      return { success: false, error: "Failed to retrieve updated date set" }
    }
    
    // In development mode, update the mock date set
    if (process.env.NODE_ENV === 'development' && userId === "test-user-id") {
      await storeMockDateSet(dateSet);
    }
    
    return { success: true, dateSet }
  } catch (error) {
    console.error("Error updating date set:", error)
    return { success: false, error: "Failed to update date set" }
  }
}

