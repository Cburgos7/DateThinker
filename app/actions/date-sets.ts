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
  shareDateSet,
  unshareDateSet,
  getSharedWithMeDateSets,
  getDateSetSharedUsers,
  updateDateSet,
  SharedDateSet
} from "@/lib/date-sets"
import type { PlaceResult } from "@/lib/search-utils"
import { storeMockDateSet } from "@/app/actions/date-plans"
import { getCurrentUser } from '@/lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from "@/lib/supabase"

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
    console.log("Starting saveDateSetAction");
    
    // Create a server action client
    const cookieStore = cookies()
    
    // Try three different approaches to get the user session
    let userId = null;
    let authError = null;
    
    // Approach 1: Use the createServerActionClient
    try {
      const supabaseServer = createServerActionClient({ cookies: () => cookieStore })
      const sessionResponse = await supabaseServer.auth.getSession()
      console.log("Auth session response (approach 1):", {
        hasSession: !!sessionResponse.data.session,
        error: sessionResponse.error ? sessionResponse.error.message : null
      });
      
      if (sessionResponse.data.session?.user?.id) {
        userId = sessionResponse.data.session.user.id;
        console.log("User ID found with approach 1:", userId);
      } else {
        authError = "No session found with approach 1";
      }
    } catch (e) {
      console.error("Error with approach 1:", e);
      authError = `Approach 1 error: ${e instanceof Error ? e.message : 'Unknown error'}`;
    }
    
    // Approach 2: Use the imported supabase client directly
    if (!userId && supabase) {
      try {
        const { data, error } = await supabase.auth.getSession();
        console.log("Auth session response (approach 2):", {
          hasSession: !!data.session,
          error: error ? error.message : null
        });
        
        if (data.session?.user?.id) {
          userId = data.session.user.id;
          console.log("User ID found with approach 2:", userId);
        } else {
          if (!authError) authError = "No session found with approach 2";
        }
      } catch (e) {
        console.error("Error with approach 2:", e);
        if (!authError) authError = `Approach 2 error: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }
    }
    
    // Approach 3: Use getCurrentUser from supabase.ts
    if (!userId) {
      try {
        const user = await getCurrentUser();
        console.log("Auth session response (approach 3):", {
          hasUser: !!user,
          userId: user?.id
        });
        
        if (user?.id) {
          userId = user.id;
          console.log("User ID found with approach 3:", userId);
        } else {
          if (!authError) authError = "No user found with approach 3";
        }
      } catch (e) {
        console.error("Error with approach 3:", e);
        if (!authError) authError = `Approach 3 error: ${e instanceof Error ? e.message : 'Unknown error'}`;
      }
    }
    
    // Debug cookie information
    console.log("Cookie store available:", !!cookieStore);
    
    // In development mode, use a test ID if no session
    if (!userId && process.env.NODE_ENV === 'development') {
      console.log("Development mode: Using test user ID");
      userId = 'a17c9b47-b462-4d96-8519-90b7601e76ec';
    }

    if (!userId) {
      console.error("No user ID available after all approaches", { authError });
      return { 
        success: false, 
        error: "User not authenticated. Please try signing out completely and signing back in. Error details: " + authError 
      }
    }

    console.log("Using user ID:", userId);
    
    // Use the imported supabase client for the database operation
    if (!supabase) {
      return { 
        success: false, 
        error: "Database client not initialized" 
      }
    }
    
    // Generate a unique ID for the date set
    const id = uuidv4();

    // Prepare data for insert
    const dataToInsert = {
      id,  // Include the generated ID
      user_id: userId,
      title,
      date,
      start_time: startTime,
      end_time: endTime,
      places,
      share_id: `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      notes: notes || null,
    }
    
    // Log the insert attempt
    console.log("Attempting to insert date set with data:", {
      id,
      user_id: userId,
      title,
      date,
      places_count: places.length
    });

    // Insert the data using the imported supabase client
    const { data, error } = await supabase
      .from('date_sets')
      .insert(dataToInsert)
      .select()
      .single()
    
    if (error) {
      console.error("Failed to create date set:", {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return { success: false, error: `Failed to create date set: ${error.message}` }
    }

    console.log("Successfully created date set with ID:", data.id);
    return { success: true, dateSetId: data.id }
    
  } catch (error) {
    console.error("Error in saveDateSetAction:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to save date set" 
    }
  }
}

export async function getUserDateSetsAction() {
  try {
    // Get the current user session
    const user = await getCurrentUser()
    
    // Use the actual user ID if available, otherwise use the specific UUID in development
    const userId = user?.id || (process.env.NODE_ENV === 'development' ? "a17c9b47-b462-4d96-8519-90b7601e76ec" : null)
    
    if (!userId) {
      return { success: false, error: "User not authenticated" }
    }
    
    console.log("Getting date sets for user ID:", userId)
    
    // Get the user's date sets
    const dateSets = await getUserDateSets(userId)
    
    console.log("Retrieved date sets:", dateSets.length)
    
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

// NEW SERVER ACTIONS FOR SHARING

// Share a date set with another user by email
export async function shareDateSetWithUserAction(
  dateSetId: string,
  ownerId: string, 
  userEmail: string,
  permissionLevel: "view" | "edit" = "view"
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabase) {
      return { 
        success: false, 
        error: "Database client not initialized" 
      }
    }
    
    // Find the user by their email in the profiles table
    const { data: userData, error: userError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle()

    if (userError) {
      console.error("Error finding user:", userError)
      return { 
        success: false, 
        error: "Error finding user: " + userError.message 
      }
    }

    if (!userData) {
      return { 
        success: false, 
        error: "Could not find a user with that email address" 
      }
    }

    const sharedWithId = userData.id

    // Now share with this user
    const shareResult = await shareDateSet(
      dateSetId, 
      ownerId, 
      sharedWithId, 
      permissionLevel
    )

    if (!shareResult) {
      return { 
        success: false, 
        error: "Failed to share the date set" 
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in shareDateSetWithUserAction:", error)
    return { 
      success: false, 
      error: "An unexpected error occurred while sharing the date set" 
    }
  }
}

// Unshare a date set with a user
export async function unshareDateSetAction(
  dateSetId: string,
  ownerId: string,
  sharedWithId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await unshareDateSet(dateSetId, ownerId, sharedWithId)

    if (!result) {
      return { 
        success: false, 
        error: "Failed to remove user from shared date set" 
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in unshareDateSetAction:", error)
    return { 
      success: false, 
      error: "An unexpected error occurred while unsharing the date set" 
    }
  }
}

// Get all date sets shared with the current user
export async function getSharedWithMeDateSetsAction(
  userId: string
): Promise<{ success: boolean; dateSets?: SharedDateSet[]; error?: string }> {
  try {
    const dateSets = await getSharedWithMeDateSets(userId)
    return { success: true, dateSets }
  } catch (error) {
    console.error("Error in getSharedWithMeDateSetsAction:", error)
    return { 
      success: false, 
      error: "Failed to retrieve shared date sets" 
    }
  }
}

// Get all users a date set is shared with
export async function getDateSetSharedUsersAction(
  dateSetId: string,
  ownerId: string
): Promise<{ 
  success: boolean; 
  users?: { id: string; full_name: string | null; permission_level: "view" | "edit" }[]; 
  error?: string 
}> {
  try {
    const users = await getDateSetSharedUsers(dateSetId, ownerId)
    return { success: true, users }
  } catch (error) {
    console.error("Error in getDateSetSharedUsersAction:", error)
    return { 
      success: false, 
      error: "Failed to retrieve users with access to this date set" 
    }
  }
}

// New version of saveDateSetAction that accepts an explicit user ID
export async function saveDateSetWithUserIdAction(
  title: string,
  date: string,
  startTime: string,
  endTime: string,
  places: PlaceResult[],
  notes: string | undefined,
  clientUserId: string
) {
  try {
    console.log("Starting saveDateSetWithUserIdAction with client-provided user ID:", clientUserId);
    
    if (!clientUserId) {
      return { 
        success: false, 
        error: "No user ID provided" 
      }
    }
    
    // Create a server action client with the correct auth context
    const cookieStore = cookies()
    
    // Log cookie debugging info
    try {
      console.log("Cookie store available:", !!cookieStore);
    } catch (e) {
      console.log("Could not log cookies:", e);
    }
    
    const supabaseServer = createServerActionClient({ cookies: () => cookieStore });
    
    // Attempt to get session
    console.log("Attempting to get server-side session...");
    const { data: sessionData, error: sessionError } = await supabaseServer.auth.getSession();
    
    if (sessionError) {
      console.error("Error getting session:", sessionError);
      // Continue with client ID despite the error
    }
    
    let userId = sessionData?.session?.user?.id || null;
    
    if (!userId) {
      console.log("No server session found, using client-provided ID directly:", clientUserId);
      // Since we've updated our RLS policy to allow specific test IDs, we can use the client ID directly
      userId = clientUserId;
    } else {
      console.log("Server session found with user ID:", userId);
      
      if (userId !== clientUserId) {
        console.warn("Server session user ID doesn't match client user ID", {
          serverUserId: userId,
          clientUserId
        });
      }
    }
    
    // Generate a unique ID for the date set
    const id = uuidv4();

    // Prepare data for insert
    const dataToInsert = {
      id,
      user_id: userId, // Use either server user ID or client user ID
      title,
      date,
      start_time: startTime,
      end_time: endTime,
      places,
      share_id: `share-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      notes: notes || null,
    }
    
    // Log the insert attempt
    console.log("Attempting to insert date set with user ID:", {
      id,
      user_id: userId,
      title,
      date,
      places_count: places.length
    });

    // Try with the server client first
    try {
      const { data, error } = await supabaseServer
        .from('date_sets')
        .insert(dataToInsert)
        .select()
        .single();
        
      if (error) {
        console.error("Server client insert failed:", error);
        throw error;
      }
      
      console.log("Successfully created date set with ID:", data.id);
      return { success: true, dateSetId: data.id };
    } catch (serverError) {
      console.log("Server insert failed, trying with direct client...");
      
      // If the server client fails, try with the imported supabase client
      if (!supabase) {
        return { 
          success: false, 
          error: "Server insert failed and no fallback client available" 
        };
      }
      
      try {
        // Try with the client directly as a fallback
        const { data, error } = await supabase
          .from('date_sets')
          .insert(dataToInsert)
          .select()
          .single();
          
        if (error) {
          console.error("Direct client insert also failed:", error);
          return { success: false, error: `Failed to create date set: ${error.message}` };
        }
        
        console.log("Successfully created date set with fallback client, ID:", data.id);
        return { success: true, dateSetId: data.id };
      } catch (clientError) {
        console.error("Both insert methods failed:", clientError);
        return { 
          success: false, 
          error: "All insertion methods failed. Please try again later." 
        };
      }
    }
  } catch (error) {
    console.error("Error in saveDateSetWithUserIdAction:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to save date set" 
    }
  }
}

