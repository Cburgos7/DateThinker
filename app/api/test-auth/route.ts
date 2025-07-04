import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Test 1: Get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log("🔍 Test Auth - User:", user?.email, "ID:", user?.id);
    console.log("🔍 Test Auth - User Error:", userError);
    
    if (!user) {
      return NextResponse.json({ 
        error: "No user found",
        user: null,
        authUid: null,
        canInsertFavorite: false
      });
    }
    
    // Test 2: Check what auth.uid() returns in a query
    const { data: authCheck, error: authError } = await supabase
      .rpc('get_current_user_id');
    
    console.log("🔍 Test Auth - auth.uid() result:", authCheck);
    console.log("🔍 Test Auth - auth.uid() error:", authError);
    
    // Test 3: Try to insert a test favorite to see what happens
    const testFavorite = {
      user_id: user.id,
      place_id: "test_place_" + Date.now(),
      name: "Test Place",
      category: "restaurant" as const,
      address: "123 Test St",
      rating: 4.5,
      price: 2,
      photo_url: null
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from("favorites")
      .insert(testFavorite)
      .select();
    
    console.log("🔍 Test Auth - Insert result:", insertData);
    console.log("🔍 Test Auth - Insert error:", insertError);
    
    // Test 4: Clean up the test favorite if it was inserted
    if (insertData && insertData.length > 0) {
      await supabase
        .from("favorites")
        .delete()
        .eq("id", insertData[0].id);
    }
    
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      authUid: authCheck,
      insertSuccess: !insertError,
      insertError: insertError?.message,
      canInsertFavorite: !insertError
    });
    
  } catch (error) {
    console.error("🔍 Test Auth - Unexpected error:", error);
    return NextResponse.json({ 
      error: "Server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
} 