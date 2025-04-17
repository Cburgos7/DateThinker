import { createClient } from "@/utils/supabase/client"

// Define the DateSet type here since we can't import it
interface DateSet {
  id: string
  user_id: string
  title: string
  date: string
  start_time: string
  end_time: string
  places: any[]
  notes?: string
  description?: string
  name?: string
  created_at: string
  share_id?: string
}

export async function createDateSet(userId: string, name: string, description: string = "") {
  try {
    const supabase = createClient()
    
    // Insert the new date set
    const { data, error } = await supabase
      .from('date_sets')
      .insert({
        user_id: userId,
        name,
        description,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error("Error creating date set:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data }
  } catch (error) {
    console.error("Error in createDateSet:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

export async function getUserDateSets(userId: string) {
  try {
    const supabase = createClient()
    
        const { data, error } = await supabase
      .from('date_sets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error("Error fetching date sets:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true, data: data as DateSet[] }
  } catch (error) {
    console.error("Error in getUserDateSets:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

// For backward compatibility
export const getUserDateSetsAction = getUserDateSets

