import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { favoriteId, user_rating, user_notes } = await request.json();
    
    if (!favoriteId) {
      return NextResponse.json({ error: "Favorite ID is required" }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    console.log("🔄 Update Favorite API - User:", user.email, "Favorite ID:", favoriteId);
    
    // Update the favorite with user rating and notes
    // First check if the columns exist, if not provide a helpful error
    const updateData: any = {};
    
    if (user_rating !== undefined && user_rating !== null) {
      updateData.user_rating = user_rating;
    }
    if (user_notes !== undefined && user_notes !== null) {
      updateData.user_notes = user_notes;
    }
    
    const { data, error } = await supabase
      .from("favorites")
      .update(updateData)
      .eq("id", favoriteId)
      .eq("user_id", user.id) // Security check - only update user's own favorites
      .select()
      .single();
    
    if (error) {
      console.error("❌ Update Favorite API - Error:", error);
      
      // Check if error is related to missing columns
      if (error.message?.includes('user_rating') || error.message?.includes('user_notes')) {
        return NextResponse.json({ 
          error: "Database needs to be updated to support ratings. Please run the database migration first.",
          details: error.message,
          migration_needed: true
        }, { status: 500 });
      }
      
      return NextResponse.json({ error: "Failed to update favorite" }, { status: 500 });
    }
    
    console.log("✅ Update Favorite API - Updated successfully");
    
    return NextResponse.json({ 
      success: true,
      favorite: data
    });
    
  } catch (error) {
    console.error("❌ Update Favorite API - Unexpected error:", error);
    return NextResponse.json({ 
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 