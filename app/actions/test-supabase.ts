"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function testSupabaseConnection() {
  try {
    console.log("Starting Supabase connection test");
    console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log("Anon key length:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length);
    
    // Create a server action client
    const cookieStore = cookies()
    const supabase = createServerActionClient({ cookies: () => cookieStore })
    
    console.log("Supabase client created, attempting insert...");
    
    // Try a simple insert
    const { data, error } = await supabase
      .from('test_entries')
      .insert({
        content: `Test entry at ${new Date().toISOString()}`
      })
      .select()
      .single()
    
    if (error) {
      console.error("Supabase test insert failed:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return { success: false, error: error.message }
    }

    console.log("Supabase test insert successful:", data);
    return { success: true, data }
    
  } catch (error) {
    console.error("Error in test connection:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
} 