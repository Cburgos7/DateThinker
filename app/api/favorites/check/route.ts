import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { placeIds, getAllFavorites } = body;
    
    // If getAllFavorites is true, fetch all favorites for the user
    if (getAllFavorites) {
      const supabase = await createClient();
      
      // Get the user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
      }
      
      console.log("🔍 Get All Favorites API - User:", user.email);
      
      // Get all favorites for this user with full details
      const { data: favorites, error: favoritesError } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (favoritesError) {
        console.error("🔍 Get All Favorites API - Error:", favoritesError);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
      
      console.log("✅ Get All Favorites API - Found favorites:", favorites?.length || 0);
      
      return NextResponse.json({ 
        success: true,
        favorites: favorites || []
      });
    }
    
    // Original functionality - check specific place IDs
    if (!placeIds || !Array.isArray(placeIds)) {
      return NextResponse.json({ error: "Place IDs array is required" }, { status: 400 });
    }
    
    const supabase = await createClient();
    
    // Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    
    console.log("🔍 Check Favorites API - User:", user.email, "Checking:", placeIds.length, "places");
    
    // Get all favorites for this user that match the place IDs
    const { data: favorites, error: favoritesError } = await supabase
      .from("favorites")
      .select("place_id")
      .eq("user_id", user.id)
      .in("place_id", placeIds);
    
    if (favoritesError) {
      console.error("🔍 Check Favorites API - Error:", favoritesError);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
    
    // Create array of place IDs that are favorited
    const favoritedPlaceIds = favorites?.map(f => f.place_id) || [];
    
    console.log("✅ Check Favorites API - Found favorites:", favoritedPlaceIds);
    
    return NextResponse.json({ 
      success: true,
      favorites: favoritedPlaceIds
    });
    
  } catch (error) {
    console.error("🔍 Check Favorites API - Unexpected error:", error);
    return NextResponse.json({ 
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 