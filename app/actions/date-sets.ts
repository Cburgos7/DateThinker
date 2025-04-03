"use server"

import { getCurrentUser } from "@/lib/supabase"
import {
  createDateSet,
  getUserDateSets,
  getDateSetById,
  deleteDateSet,
  getDateSetByShareId,
  generateICalEvent,
  generateGoogleCalendarLink,
} from "@/lib/date-sets"
import type { PlaceResult } from "@/app/actions"
import type { Database } from "@/lib/database.types"

type DateSet = Database["public"]["Tables"]["date_sets"]["Row"]

export async function saveDateSet(
  title: string,
  date: string,
  startTime: string,
  endTime: string,
  places: PlaceResult[],
  notes?: string,
): Promise<{ success: boolean; dateSetId?: string; error?: string }> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: "You must be logged in to save a date set" }
    }

    console.log("Saving date set for user:", user.id, "with places:", places.length)

    // Validate input data
    if (!title) return { success: false, error: "Title is required" }
    if (!date) return { success: false, error: "Date is required" }
    if (!startTime) return { success: false, error: "Start time is required" }
    if (!endTime) return { success: false, error: "End time is required" }
    if (!places || places.length === 0) return { success: false, error: "At least one place is required" }

    const dateSetId = await createDateSet(user.id, title, date, startTime, endTime, places, notes)

    if (!dateSetId) {
      return { success: false, error: "Failed to create date set" }
    }

    return { success: true, dateSetId }
  } catch (error) {
    console.error("Error saving date set:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "An unexpected error occurred",
    }
  }
}

export async function getUserDateSetsAction(): Promise<{ success: boolean; dateSets?: DateSet[]; error?: string }> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: "You must be logged in to view your date sets" }
    }

    const dateSets = await getUserDateSets(user.id)
    return { success: true, dateSets }
  } catch (error) {
    console.error("Error getting date sets:", error)
    return { success: false, error: "Failed to retrieve date sets" }
  }
}

export async function deleteDateSetAction(dateSetId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: "You must be logged in to delete a date set" }
    }

    const success = await deleteDateSet(dateSetId, user.id)
    return { success, error: success ? undefined : "Failed to delete date set" }
  } catch (error) {
    console.error("Error deleting date set:", error)
    return { success: false, error: "An unexpected error occurred" }
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
    const user = await getCurrentUser()

    if (!user) {
      return { success: false, error: "You must be logged in to export a calendar" }
    }

    const dateSet = await getDateSetById(dateSetId)

    if (!dateSet) {
      return { success: false, error: "Date set not found" }
    }

    // Verify ownership
    if (dateSet.user_id !== user.id) {
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

