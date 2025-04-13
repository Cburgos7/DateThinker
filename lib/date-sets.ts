import { supabase } from "./supabase"
import type { PlaceResult } from "@/lib/search-utils"
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

export type SharedDateSet = {
  id: string
  date_set_id: string
  owner_id: string
  shared_with_id: string
  permission_level: "view" | "edit"
  created_at: string
  date_set: DateSet
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
    // Check if we're in development mode and using a test user ID
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTestUser = userId === 'test-user-id';
    
    if (isDevelopment && isTestUser) {
      console.log("Development mode: Using mock date set ID for testing");
      // Return a mock ID for testing in development
      return "mock-date-set-id-" + Date.now();
    }
    
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
    // Convert each place to a plain object with only the necessary properties
    const sanitizedPlaces = places.map((place) => {
      // Create a plain object with only the properties we need
      const plainPlace = {
        id: place.id,
        name: place.name,
        rating: place.rating,
        address: place.address,
        price: place.price,
        isOutdoor: place.isOutdoor || false,
        photoUrl: place.photoUrl || null,
        openNow: place.openNow || false,
        category: place.category,
        placeId: place.placeId || null
      };
      
      // Remove any undefined or null values
      Object.keys(plainPlace).forEach(key => {
        if (plainPlace[key as keyof typeof plainPlace] === undefined) {
          delete plainPlace[key as keyof typeof plainPlace];
        }
      });
      
      return plainPlace;
    });

    // Log the sanitized places data
    console.log("Sanitized places data:", JSON.stringify(sanitizedPlaces, null, 2));

    // Create the data object to insert
    const dataToInsert = {
      user_id: userId,
      title,
      date,
      start_time: startTime,
      end_time: endTime,
      places: sanitizedPlaces,
      share_id: shareId,
      notes: notes || null,
    };
    
    console.log("Data being inserted into Supabase:", JSON.stringify(dataToInsert, null, 2));

    // Insert the data into Supabase
    const { data, error } = await supabase
      .from("date_sets")
      .insert(dataToInsert)
      .select()

    if (error) {
      console.error("Supabase error creating date set:", error)
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      })
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
    console.error("Error in createDateSet:", error)
    return null
  }
}

// Get all date sets for a user
export async function getUserDateSets(userId: string): Promise<DateSet[]> {
  try {
    // Check if we're in development mode and using a test user ID
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTestUser = userId === 'a17c9b47-b462-4d96-8519-90b7601e76ec';
    
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return []
    }

    console.log("Fetching date sets for user ID:", userId)
    
    // Get real data from Supabase regardless of development mode
    const { data, error } = await supabase
      .from("date_sets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching date sets:", error)
      return []
    }

    console.log("Fetched date sets from Supabase:", data?.length || 0)

    // In development mode with test user, also include mock data
    if (isDevelopment && isTestUser) {
      console.log("Development mode: Including mock date sets for testing");
      const mockData = [
        {
          id: "mock-date-set-1",
          title: "Test Date Plan",
          date: new Date().toISOString().split('T')[0],
          start_time: "6:00 PM",
          end_time: "8:00 PM",
          places: [
            {
              id: "test-place-1",
              name: "Test Restaurant",
              rating: 4.5,
              address: "123 Test St, Test City, TS 12345",
              price: 2, // Price level as a number (0-4)
              isOutdoor: true,
              photoUrl: "/placeholder.jpg",
              openNow: true,
              category: "restaurant",
              placeId: "test-place-id-1"
            } as PlaceResult
          ],
          share_id: "mock-share-id-1",
          notes: "This is a test date plan",
          created_at: new Date().toISOString(),
          user_id: userId
        }
      ];
      
      // Combine real data with mock data
      return [...(data as DateSet[]), ...mockData];
    }

    return data as DateSet[]
  } catch (error) {
    console.error("Error in getUserDateSets:", error)
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

export async function updateDateSet(
  id: string,
  userId: string,
  title: string,
  date: string,
  startTime: string,
  endTime: string,
  places: PlaceResult[],
  notes?: string
): Promise<boolean> {
  try {
    // Check if we're in development mode and using a test user ID
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isTestUser = userId === 'test-user-id';
    
    if (isDevelopment && isTestUser) {
      console.log("Development mode: Updating mock date set");
      return true;
    }
    
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return false
    }

    // Update the date set in the database
    const { error } = await supabase
      .from('date_sets')
      .update({
        title,
        date,
        start_time: startTime,
        end_time: endTime,
        places,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error("Error updating date set:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error updating date set:", error)
    return false
  }
}

// NEW FUNCTIONS FOR SHARING

// Share a date set with another user
export async function shareDateSet(
  dateSetId: string, 
  ownerId: string, 
  sharedWithId: string, 
  permissionLevel: "view" | "edit" = "view",
  status: "pending" | "accepted" | "declined" = "accepted" // Default to accepted for direct shares
): Promise<boolean> {
  try {
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return false
    }

    const isInvitationAcceptance = ownerId === sharedWithId;
    
    console.log("Sharing date set:", { 
      dateSetId, 
      ownerId, 
      sharedWithId, 
      permissionLevel,
      status,
      isInvitationAcceptance
    });

    // Verify that the date set exists
    const { data: dateSet, error: dateSetError } = await supabase
      .from("date_sets")
      .select("id, user_id, share_id")
      .eq("id", dateSetId)
      .single()

    if (dateSetError) {
      console.error("Error finding date set:", dateSetError)
      return false
    }
    
    if (!dateSet) {
      console.error("Date set not found:", dateSetId)
      return false
    }
    
    // Determine the actual owner ID from the date set
    const actualOwnerId = dateSet.user_id;
    
    console.log(`Actual owner ID from the date set: ${actualOwnerId}`);
    
    let shareRecord;
    
    if (isInvitationAcceptance) {
      // This is a user accepting an invitation
      console.log("Processing invitation acceptance");
      shareRecord = {
        date_set_id: dateSetId,
        owner_id: actualOwnerId,
        shared_with_id: sharedWithId,
        permission_level: permissionLevel,
        status: status
      };
    } else {
      // This is an owner sharing with another user
      console.log("Processing owner sharing with another user");
      shareRecord = {
        date_set_id: dateSetId,
        owner_id: ownerId,
        shared_with_id: sharedWithId,
        permission_level: permissionLevel,
        status: status
      };
    }
    
    console.log("Share record being created:", shareRecord);
    
    // Create the sharing record based on who is initiating
    const { error } = await supabase
      .from("shared_date_sets")
      .upsert(shareRecord)

    if (error) {
      console.error("Error creating/updating sharing record:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      return false
    }

    return true
  } catch (error) {
    console.error("Error in shareDateSet:", error)
    return false
  }
}

// Remove sharing of a date set with a user
export async function unshareDateSet(
  dateSetId: string,
  ownerId: string,
  sharedWithId: string
): Promise<boolean> {
  try {
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return false
    }

    const { error } = await supabase
      .from("shared_date_sets")
      .delete()
      .eq("date_set_id", dateSetId)
      .eq("owner_id", ownerId)
      .eq("shared_with_id", sharedWithId)

    if (error) {
      console.error("Error unsharing date set:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in unshareDateSet:", error)
    return false
  }
}

// Get all date sets shared with a user
export async function getSharedWithMeDateSets(userId: string): Promise<SharedDateSet[]> {
  try {
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return []
    }

    const { data, error } = await supabase
      .from("shared_date_sets")
      .select(`
        *,
        date_set:date_sets(*)
      `)
      .eq("shared_with_id", userId)

    if (error) {
      console.error("Error getting shared date sets:", error)
      return []
    }

    return data.map(item => ({
      ...item,
      date_set: item.date_set as unknown as DateSet
    })) as unknown as SharedDateSet[]
  } catch (error) {
    console.error("Error in getSharedWithMeDateSets:", error)
    return []
  }
}

// Get all users a date set is shared with
export async function getDateSetSharedUsers(
  dateSetId: string,
  ownerId: string
): Promise<{ id: string; full_name: string | null; permission_level: "view" | "edit" }[]> {
  try {
    if (!dateSetId || !ownerId) {
      console.error("getDateSetSharedUsers: Missing required parameters", { dateSetId, ownerId })
      return []
    }
    
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return []
    }

    console.log("getDateSetSharedUsers: Checking ownership for", { dateSetId, ownerId })
    
    // Verify ownership first - but make this optional
    try {
      const { data: dateSet, error: dateSetError } = await supabase
        .from("date_sets")
        .select("id")
        .eq("id", dateSetId)
        .eq("user_id", ownerId)
        .single()

      if (dateSetError) {
        console.error("Error verifying date set ownership:", dateSetError)
        // Continue anyway
      }

      if (!dateSet) {
        console.log("Date set not owned by user or not found:", { dateSetId, ownerId })
        // Skip ownership check - this allows viewing shared users even if you're not the owner
        console.log("Fetching shared users without ownership check")
      }
    } catch (ownershipError) {
      console.error("Error during ownership check:", ownershipError)
      // Continue anyway
    }

    console.log("getDateSetSharedUsers: Fetching shared users for", { dateSetId, ownerId })
    
    // Get all shared users - try a simpler query first
    try {
      const { data, error } = await supabase
        .from("shared_date_sets")
        .select(`
          id,
          shared_with_id,
          permission_level
        `)
        .eq("date_set_id", dateSetId)
        .eq("owner_id", ownerId)

      if (error) {
        console.error("Error getting shared users with simple query:", error)
        throw error
      }

      console.log("getDateSetSharedUsers: Raw data from simple query:", data)
      
      if (!data || data.length === 0) {
        return []
      }
      
      // Now get the profile data for each user
      const profiles: Record<string, any> = {}
      
      for (const item of data) {
        try {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("id, full_name")
            .eq("id", item.shared_with_id)
            .single()
            
          if (profileError) {
            console.error("Error fetching profile for user:", item.shared_with_id, profileError)
          } else if (profile) {
            profiles[item.shared_with_id] = profile
          }
        } catch (profileError) {
          console.error("Exception fetching profile:", profileError)
        }
      }
      
      // Build the result
      const result = data.map(item => ({
        id: item.shared_with_id,
        full_name: profiles[item.shared_with_id]?.full_name || null,
        permission_level: item.permission_level as "view" | "edit"
      }))
      
      console.log("getDateSetSharedUsers: Processed data:", result)
      return result
    } catch (queryError) {
      console.error("Error with simple shared users query:", queryError)
      
      // Try the original join query as a fallback
      try {
        const { data, error } = await supabase
          .from("shared_date_sets")
          .select(`
            shared_with_id,
            permission_level,
            shared_with:profiles!shared_date_sets_shared_with_id_fkey(id, full_name)
          `)
          .eq("date_set_id", dateSetId)
          .eq("owner_id", ownerId)

        if (error) {
          console.error("Error getting shared users with join query:", error)
          return []
        }

        console.log("getDateSetSharedUsers: Raw data from join query:", data)
        
        // Process the data safely using type assertion and optional chaining
        const processedData = (data || []).map((item: any) => {
          // Handle both potential data structures that might come back from Supabase
          const sharedWith = item.shared_with;
          
          const result = {
            id: typeof sharedWith === 'object' && sharedWith !== null 
              ? sharedWith.id || item.shared_with_id
              : item.shared_with_id,
            full_name: typeof sharedWith === 'object' && sharedWith !== null
              ? sharedWith.full_name
              : null,
            permission_level: item.permission_level as "view" | "edit"
          };
          
          return result;
        });
        
        console.log("getDateSetSharedUsers: Processed data from join:", processedData)
        return processedData;
      } catch (joinError) {
        console.error("Both query attempts failed:", joinError)
        return []
      }
    }
  } catch (error) {
    console.error("Error in getDateSetSharedUsers:", error)
    return []
  }
}

export async function updateDateShareStatus(
  dateSetId: string,
  userId: string,
  status: "accepted" | "declined"
): Promise<boolean> {
  try {
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return false
    }
    
    const { error } = await supabase
      .from("shared_date_sets")
      .update({ status })
      .eq("date_set_id", dateSetId)
      .eq("shared_with_id", userId);

    return !error;
  } catch (error) {
    console.error("Error updating share status:", error);
    return false;
  }
}

// Allow a user to remove a date set shared with them (without deleting the original)
export async function removeSharedDateSet(dateSetId: string, userId: string): Promise<boolean> {
  try {
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables");
      return false;
    }
    
    console.log("Removing shared date set:", { dateSetId, userId });
    
    // Delete the shared_date_sets record
    const { error } = await supabase
      .from("shared_date_sets")
      .delete()
      .eq("date_set_id", dateSetId)
      .eq("shared_with_id", userId);
    
    if (error) {
      console.error("Error removing shared date set:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error in removeSharedDateSet:", error);
    return false;
  }
}




