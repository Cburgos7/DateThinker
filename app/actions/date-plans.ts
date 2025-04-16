import { createServerClient } from "@/lib/supabase/server"
import { DatePlan } from "@/lib/types"
import { DateSet } from "@/lib/date-sets"
import { createClient } from "@/utils/supabase/client"

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV === 'development'

// Store mock date sets in memory for development mode
const mockDateSets: Record<string, DateSet> = {}

/**
 * Get a date plan by ID
 */
export async function getDatePlan(id: string): Promise<DatePlan | null> {
  try {
    // Check if this is a mock ID from development mode
    if (isDevelopment && (id.startsWith('mock-date-set-id-') || id === 'mock-date-set-1')) {
      console.log("Development mode: Using mock date plan for testing");
      
      // Check if we have this mock date set stored
      if (mockDateSets[id]) {
        console.log("Found stored mock date set:", mockDateSets[id]);
        
        // Convert DateSet to DatePlan format
        const mockDatePlan: DatePlan = {
          id: mockDateSets[id].id,
          title: mockDateSets[id].title,
          description: mockDateSets[id].notes || "No description provided",
          activities: mockDateSets[id].places.map(place => ({
            name: place.name,
            description: `${place.address} - ${place.rating ? `Rating: ${place.rating}` : 'No rating'}`,
            duration: "1 hour"
          })),
          created_at: mockDateSets[id].created_at,
          updated_at: mockDateSets[id].created_at,
          user_id: mockDateSets[id].user_id
        };
        
        return mockDatePlan;
      }
      
      // Create a default mock date plan if not found
      const mockDatePlan: DatePlan = {
        id: id,
        title: "Test Date Plan",
        description: "This is a test date plan created in development mode",
        activities: [
          {
            name: "Test Restaurant",
            description: "123 Test St - Rating: 4.5",
            duration: "1 hour"
          },
          {
            name: "Test Activity",
            description: "456 Activity Ave - Rating: 4.0",
            duration: "1 hour"
          }
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: "test-user-id"
      };
      
      return mockDatePlan;
    }
    
    // Only try to use Supabase if not in development mode or not using a mock ID
    if (!isDevelopment) {
      const supabase = createServerClient()
      
      const { data, error } = await supabase
        .from("date_plans")
        .select("*")
        .eq("id", id)
        .single()
      
      if (error) {
        console.error("Error fetching date plan:", error)
        return null
      }
      
      return data as DatePlan
    }
    
    // If we're in development mode but don't have a mock date set, return null
    return null;
  } catch (error) {
    console.error("Error in getDatePlan:", error)
    return null
  }
}

/**
 * Store a mock date set for development mode
 */
export async function storeMockDateSet(dateSet: DateSet): Promise<void> {
  if (isDevelopment) {
    console.log("Storing mock date set:", dateSet);
    mockDateSets[dateSet.id] = dateSet;
  }
}

export async function getAllDatePlans() {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('date_plans')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error("Error fetching date plans:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error("Error in getAllDatePlans:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
} 