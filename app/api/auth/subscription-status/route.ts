import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET() {
  console.log("🔄 API: Starting subscription status check...");
  
  try {
    // Use the new server client pattern
    const supabase = await createClient();
    
    // Get the user - this uses getUser() which is more reliable than getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log("❌ API: Error getting user:", userError.message);
      return NextResponse.json({ 
        authenticated: false,
        subscription_status: "free",
        subscription_expiry: null,
        user_id: null,
        user_email: null,
        message: "Authentication error"
      });
    }
    
    if (user) {
      console.log("✅ API: User found:", user.email);
      
      // Get the user's subscription status from the database
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("subscription_status, subscription_expiry")
        .eq("id", user.id)
        .single();
      
      if (!error && profile) {
        console.log("✅ API: Profile found:", profile.subscription_status);
        return NextResponse.json({ 
          authenticated: true,
          subscription_status: profile.subscription_status || "free",
          subscription_expiry: profile.subscription_expiry || null,
          user_id: user.id,
          user_email: user.email
        });
      } else {
        console.log("⚠️ API: No profile found or error:", error?.message);
        // User exists but no profile, return authenticated with free status
        return NextResponse.json({ 
          authenticated: true,
          subscription_status: "free",
          subscription_expiry: null,
          user_id: user.id,
          user_email: user.email
        });
      }
    }
    
    // No user found
    console.log("❌ API: No user found");
    return NextResponse.json({ 
      authenticated: false,
      subscription_status: "free",
      subscription_expiry: null,
      user_id: null,
      user_email: null,
      message: "No valid authentication found"
    });
    
  } catch (error) {
    console.log("❌ API: Unexpected error:", error);
    return NextResponse.json({ 
      authenticated: false,
      subscription_status: "free",
      subscription_expiry: null,
      user_id: null,
      user_email: null,
      message: "Server error"
    });
  }
} 