import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { place, favoriteId, action } = body;
    
    const supabase = await createClient();
    
    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    console.log("🔍 Favorites API - User:", user.email, "ID:", user.id);
    
    // Handle removal by favorite ID
    if (favoriteId && action === 'remove') {
      console.log("🔍 Favorites API - Removing favorite ID:", favoriteId);
      
      const { error: deleteError } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId)
        .eq("user_id", user.id); // Security check - only delete user's own favorites
      
      if (deleteError) {
        console.error("🔍 Favorites API - Delete error:", deleteError);
        return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
      }
      
      console.log("✅ Favorites API - Removed favorite");
      return NextResponse.json({ success: true, isFavorite: false });
    }
    
    // Original functionality - toggle based on place data
    if (!place) {
      return NextResponse.json({ error: "Place data is required" }, { status: 400 });
    }
    
    console.log("🔍 Favorites API - Place:", place.name, "ID:", place.id);
    
    // Check if favorite already exists
    const { data: existing, error: checkError } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("place_id", place.id)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("🔍 Favorites API - Check error:", checkError);
      return NextResponse.json({ error: "Database error checking favorites" }, { status: 500 });
    }
    
    const isFavorite = !!existing;
    console.log("🔍 Favorites API - Is favorite:", isFavorite);
    
    if (isFavorite) {
      // Remove from favorites
      const { error: deleteError } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("place_id", place.id);
      
      if (deleteError) {
        console.error("🔍 Favorites API - Delete error:", deleteError);
        return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
      }
      
      console.log("✅ Favorites API - Removed favorite");
      return NextResponse.json({ success: true, isFavorite: false });
    } else {
      // Add to favorites
      const { error: insertError } = await supabase
        .from("favorites")
        .insert({
          user_id: user.id,
          place_id: place.id,
          name: place.name,
          category: place.category,
          address: place.address,
          rating: place.rating,
          price: place.price,
          photo_url: place.photoUrl,
          types: place.types,
          google_place_id: place.google_place_id,
          created_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error("🔍 Favorites API - Insert error:", insertError);
        return NextResponse.json({ 
          error: "Failed to add favorite", 
          details: insertError.message 
        }, { status: 500 });
      }
      
      console.log("✅ Favorites API - Added favorite");
      return NextResponse.json({ success: true, isFavorite: true });
    }
    
  } catch (error) {
    console.error("🔍 Favorites API - Unexpected error:", error);
    return NextResponse.json({ 
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 