import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return NextResponse.json({ 
        status: "free", 
        message: "No authenticated user found" 
      });
    }
    
    // Get the user's subscription status from the database
    const { data: user, error } = await supabase
      .from("users")
      .select("subscription_status")
      .eq("id", session.user.id)
      .single();
    
    if (error) {
      console.error("Error fetching user subscription:", error);
      return NextResponse.json({ 
        status: "free", 
        message: "Error fetching subscription status" 
      });
    }
    
    // Return the subscription status, defaulting to "free" if not found
    return NextResponse.json({ 
      status: user?.subscription_status || "free"
    });
    
  } catch (error) {
    console.error("Subscription status error:", error);
    return NextResponse.json({ 
      status: "free", 
      message: "Error checking subscription status",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
} 