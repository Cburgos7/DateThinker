import { supabase } from "./supabase"
import type { PlaceResult } from "@/app/actions"
import { v4 as uuidv4 } from "uuid"
import type { Database, Json } from "./database.types" 

export type DateSet = {
  id: string
  title: string
  date: string
  start_time: string
  end_time: string
  places: PlaceResult[]
  share_id: string
  notes?: string | null
  created_at: string
  user_id: string
}

// Create a new date set
export async function createDateSet(
  userId: string,
  title: string,
  date: string,
  startTime: string,
  endTime: string,
  places: PlaceResult[],
  notes?: string,
): Promise<string | null> {
  try {
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return null
    }

    // Generate a unique share ID
    const shareId = uuidv4()

    // Log the data being sent to Supabase for debugging
    console.log("Creating date set with data:", {
      user_id: userId,
      title,
      date,
      start_time: startTime,
      end_time: endTime,
      places_count: places.length,
      share_id: shareId,
      notes: notes ? "provided" : "not provided",
    })

    // Ensure places is properly serialized as JSON
    const sanitizedPlaces = places.map((place) => ({
      id: place.id,
      name: place.name,
      rating: place.rating,
      address: place.address,
      price: place.price,
      isOutdoor: place.isOutdoor,
      photoUrl: place.photoUrl,
      openNow: place.openNow,
      category: place.category,
      placeId: place.placeId,
    }))

    const { data, error } = await supabase
      .from("date_sets")
      .insert({
        user_id: userId,
        title,
        date,
        start_time: startTime,
        end_time: endTime,
        places: sanitizedPlaces as any,
        share_id: shareId,
        notes: notes || null,
      } as any)
      .select()

    if (error) {
      console.error("Supabase error creating date set:", error)
      throw error
    }

    if (!data || data.length === 0) {
      console.error("No data returned from date set creation")
      return null
    }

    // Safely access the id with a type assertion
    const createdId = (data[0] as any).id
    console.log("Date set created successfully with ID:", createdId)
    return createdId
  } catch (error) {
    console.error("Error creating date set:", error)
    return null
  }
}

// Get all date sets for a user
export async function getUserDateSets(userId: string): Promise<DateSet[]> {
  try {
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return []
    }

    const { data, error } = await supabase
      .from("date_sets")
      .select("*")
      .eq("user_id", userId as any)
      .order("created_at", { ascending: false })

    if (error) throw error

    return data as unknown as DateSet[]
  } catch (error) {
    console.error("Error getting user date sets:", error)
    return []
  }
}

// Get a date set by its ID
export async function getDateSetById(id: string): Promise<DateSet | null> {
  try {
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return null
    }

    const { data, error } = await supabase
      .from("date_sets")
      .select("*")
      .eq("id", id as any)
      .single()

    if (error) throw error

    return data as unknown as DateSet
  } catch (error) {
    console.error("Error getting date set:", error)
    return null
  }
}

// Get a date set by its share ID
export async function getDateSetByShareId(shareId: string): Promise<DateSet | null> {
  try {
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return null
    }

    const { data, error } = await supabase
      .from("date_sets")
      .select("*")
      .eq("share_id", shareId as any)
      .single()

    if (error) throw error

    return data as unknown as DateSet
  } catch (error) {
    console.error("Error getting shared date set:", error)
    return null
  }
}

// Delete a date set
export async function deleteDateSet(id: string, userId: string): Promise<boolean> {
  try {
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return false
    }

    const { error } = await supabase
      .from("date_sets")
      .delete()
      .eq("id", id as any)
      .eq("user_id", userId as any)

    if (error) throw error

    return true
  } catch (error) {
    console.error("Error deleting date set:", error)
    return false
  }
}

// Generate an iCal file for a date set
export function generateICalEvent(dateSet: DateSet): string {
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"

  // Format the date and times for iCal
  const dateStr = dateSet.date.replace(/-/g, "")
  const startDateTime = `${dateStr}T${dateSet.start_time.replace(/:/g, "")}00`
  const endDateTime = `${dateStr}T${dateSet.end_time.replace(/:/g, "")}00`

  // Create description with place details
  let description = dateSet.notes ? `${dateSet.notes}\n\n` : ""

  dateSet.places.forEach((place, index) => {
    description += `${index + 1}. ${place.name}\n`
    description += `   Address: ${place.address}\n`
    if (place.openNow !== undefined) {
      description += `   ${place.openNow ? "Open now" : "Currently closed"}\n`
    }
    description += "\n"
  })

  // Generate the iCal content
  const icalContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DateThinker//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `DTSTAMP:${now}`,
    `DTSTART:${startDateTime}`,
    `DTEND:${endDateTime}`,
    `UID:${dateSet.id}@datethinker.com`,
    `SUMMARY:${dateSet.title}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")

  return icalContent
}

// Generate Google Calendar link
export function generateGoogleCalendarLink(dateSet: DateSet): string {
  const dateFormatted = dateSet.date.replace(/-/g, "")
  const startDateTime = `${dateFormatted}T${dateSet.start_time.replace(/:/g, "")}`
  const endDateTime = `${dateFormatted}T${dateSet.end_time.replace(/:/g, "")}`

  // Create description with place details
  let description = dateSet.notes ? `${dateSet.notes}\n\n` : ""

  dateSet.places.forEach((place, index) => {
    description += `${index + 1}. ${place.name}\n`
    description += `   Address: ${place.address}\n`
    if (place.openNow !== undefined) {
      description += `   ${place.openNow ? "Open now" : "Currently closed"}\n`
    }
    description += "\n"
  })

  const baseUrl = "https://calendar.google.com/calendar/render"
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: dateSet.title,
    dates: `${startDateTime}/${endDateTime}`,
    details: description,
  })

  return `${baseUrl}?${params.toString()}`
}

