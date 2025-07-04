import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { title, date, start_time, end_time, places, notes, share_id } = await request.json();
    
    // Validation
    if (!title || !date || !start_time || !places || !Array.isArray(places) || places.length === 0) {
      return NextResponse.json({ 
        error: "Missing required fields: title, date, start_time, and places are required" 
      }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    console.log("🔄 Create Date Set API - User:", user.email, "Title:", title);
    
    // Create the date set
    const { data: dateSet, error: insertError } = await supabase
      .from("date_sets")
      .insert({
        user_id: user.id,
        title: title.trim(),
        date: date,
        start_time: start_time,
        end_time: end_time || '23:59',
        places: places, // JSONB field
        notes: notes ? notes.trim() : null,
        share_id: share_id,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (insertError) {
      console.error("❌ Create Date Set API - Error:", insertError);
      
      // Handle specific error cases
      if (insertError.message?.includes('date set limit')) {
        return NextResponse.json({ 
          error: "You've reached your date set limit. Please upgrade to premium for unlimited date sets.",
          upgrade_required: true
        }, { status: 403 });
      }
      
      return NextResponse.json({ 
        error: "Failed to create date set",
        details: insertError.message 
      }, { status: 500 });
    }
    
    console.log("✅ Create Date Set API - Created successfully:", dateSet.id);
    
    return NextResponse.json({ 
      success: true,
      date_set: dateSet
    });
    
  } catch (error) {
    console.error("❌ Create Date Set API - Unexpected error:", error);
    return NextResponse.json({ 
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 