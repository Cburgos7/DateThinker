import { createServerClient } from "@/lib/supabase/server"
import { DatePlan } from "@/lib/types"

export async function getDatePlan(id: string): Promise<DatePlan | null> {
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