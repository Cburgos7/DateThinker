import { createClient } from "@/utils/supabase/client"

export async function deleteDatePlan(dateId: string) {
  try {
    const supabase = createClient()
    
    // Delete the date plan
    const { error } = await supabase
      .from('date_plans')
      .delete()
      .eq('id', dateId)
    
    if (error) {
      console.error("Error deleting date plan:", error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    console.error("Error in deleteDatePlan:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}

