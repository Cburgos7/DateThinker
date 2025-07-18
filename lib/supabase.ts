import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Update the getSiteUrl function to always use your production domain
export function getSiteUrl() {
  // Use the environment variable if available, otherwise fallback to the hardcoded URL
  return process.env.NEXT_PUBLIC_BASE_URL || "https://datethinker.com"
}

// Create a properly configured Supabase client
export const supabase = (() => {
  try {
    // Get environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Log full configuration for debugging
    console.log("🔧 Initializing Supabase client with config:", {
      url: supabaseUrl,
      keyExists: !!supabaseAnonKey,
      nodeEnv: process.env.NODE_ENV,
      isDevelopment: process.env.NODE_ENV === 'development'
    })

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("❌ Missing Supabase environment variables:", {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseAnonKey
      })
      return null
    }

    // Create client with more robust options
    console.log("🔄 Creating Supabase client...");
    const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce"
      }
    })

    // Test the connection immediately
    console.log("🔍 Testing Supabase connection...");
    
    // Perform a simple query to test the connection through a separate async function
    const testConnection = async () => {
      try {
        const { data, error } = await client.from('date_sets').select('count').single();
        if (error) {
          console.error("❌ Supabase connection test failed:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
        } else {
          console.log("✅ Supabase connection test successful:", data);
        }
      } catch (error) {
        console.error("❌ Exception testing Supabase connection:", error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error);
      }
    };
    
    // Execute the test
    testConnection();

    console.log("✅ Supabase client initialized");
    return client
  } catch (error) {
    console.error("❌ Fatal error initializing Supabase client:", error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error)
    return null
  }
})()

// Create a service role client for admin operations (bypasses RLS)
export const supabaseAdmin = (() => {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn("⚠️ Admin Supabase client not available - missing service role key")
      return null
    }

    console.log("🔧 Creating Supabase admin client with service role key")
    const adminClient = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log("✅ Supabase admin client initialized")
    return adminClient
  } catch (error) {
    console.error("❌ Error creating admin client:", error)
    return null
  }
})()

// Types for user data with subscription info
export type UserWithSubscription = {
  id: string
  email: string
  full_name?: string | null
  avatar_url?: string | null
  subscription_status: "free" | "premium" | "lifetime"
  subscription_expiry?: string | null
  stripe_customer_id?: string | null
  created_at?: string
}

// Get the current authenticated user with subscription info
export async function getCurrentUser() {
  try {
    if (!supabase) {
      console.warn("Supabase client not initialized")
      return null
    }

    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      console.log("Active session found for user ID:", session.user.id);
      return session.user
    }

    console.log("No active session found. Please log in.");
    return null
  } catch (error) {
    console.error("Error retrieving current user:", error);
    return null
  }
}

// Get the current user with subscription info from the profiles table
export async function getUserWithSubscription(): Promise<UserWithSubscription | null> {
  try {
    if (!supabase) {
      console.warn("Supabase client not initialized")
      return null
    }

    const user = await getCurrentUser()
    if (!user) {
      return null
    }

    // Get profile data with subscription info
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("Error retrieving user profile:", error)
      return null
    }

    return {
      id: user.id,
      email: user.email || "",
      full_name: data.full_name,
      avatar_url: data.avatar_url,
      subscription_status: data.subscription_status,
      subscription_expiry: data.subscription_expiry,
      stripe_customer_id: data.stripe_customer_id,
      created_at: data.created_at
    }
  } catch (error) {
    console.error("Error retrieving user with subscription:", error)
    return null
  }
}

export async function updateUserSubscription(
  userId: string,
  subscriptionStatus: "free" | "premium" | "lifetime",
  subscriptionExpiry: string | null = null,
  stripeCustomerId: string | null = null,
): Promise<boolean> {
  try {
    // Use admin client for webhook operations to bypass RLS
    const client = supabaseAdmin //|| supabase
    
    if (!client) {
      console.warn("Supabase client not initialized - missing environment variables")
      return false
    }

    console.log(`Updating subscription for user ${userId} to ${subscriptionStatus}`, {
      userId,
      subscriptionStatus,
      subscriptionExpiry,
      hasStripeCustomerId: !!stripeCustomerId,
      usingAdminClient: !!supabaseAdmin
    });

    // First check if the user profile exists
    const { data: existingProfile, error: profileError } = await client
      .from("profiles")
      .select("id, subscription_status")
      .eq("id", userId)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error(`Error checking if profile exists for user ${userId}:`, profileError);
      return false;
    }

    if (!existingProfile) {
      console.log(`Creating new profile for user ${userId} with subscription status ${subscriptionStatus}`);
      
      // Profile doesn't exist, create it
      const { error: insertError } = await client
        .from("profiles")
        .insert({
          id: userId,
          subscription_status: subscriptionStatus,
          subscription_expiry: subscriptionExpiry,
          stripe_customer_id: stripeCustomerId,
        });
        
      if (insertError) {
        console.error(`Error creating profile for user ${userId}:`, insertError);
        return false;
      }
      
      console.log(`✅ Successfully created profile for user ${userId} with ${subscriptionStatus} subscription`);
      return true;
    }
    
    // Profile exists, update it
    console.log(`Updating existing profile for user ${userId} from ${existingProfile.subscription_status} to ${subscriptionStatus}`);

    const updateData: any = {
      subscription_status: subscriptionStatus,
      subscription_expiry: subscriptionExpiry,
    }

    if (stripeCustomerId) {
      updateData.stripe_customer_id = stripeCustomerId
    }

    const { error: updateError } = await client
      .from("profiles")
      .update(updateData)
      .eq("id", userId)

    if (updateError) {
      console.error(`Error updating profile for user ${userId}:`, updateError)
      return false
    }

    console.log(`✅ Successfully updated profile for user ${userId} to ${subscriptionStatus} subscription`)
    return true
  } catch (error) {
    console.error(`Error in updateUserSubscription for user ${userId}:`, error)
    return false
  }
}

export async function ensureUserProfile(
  userId: string,
  email: string,
  fullName: string | null | undefined,
  avatarUrl: string | null | undefined,
): Promise<boolean> {
  try {
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return false
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (error && error.code !== "PGRST116") {
      console.error("Error checking profile:", error)
      return false
    }

    if (!data) {
      // Profile doesn't exist, create it
      const { error: insertError } = await supabase.from("profiles").insert({
        id: userId,
        full_name: fullName,
        avatar_url: avatarUrl,
        subscription_status: "free", // Default status
      })

      if (insertError) {
        console.error("Error creating profile:", insertError)
        return false
      }
      console.log("Created new profile for user:", userId)
    } else {
      // Profile exists, update it if needed
      const updates: { full_name?: string | null | undefined; avatar_url?: string | null | undefined } = {}

      if (fullName !== undefined && fullName !== data.full_name) {
        updates.full_name = fullName
      }

      if (avatarUrl !== undefined && avatarUrl !== data.avatar_url) {
        updates.avatar_url = avatarUrl
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase.from("profiles").update(updates).eq("id", userId)

        if (updateError) {
          console.error("Error updating profile:", updateError)
          return false
        }
        console.log("Updated profile for user:", userId)
      }
    }

    return true
  } catch (error) {
    console.error("Error in ensureUserProfile:", error)
    return false
  }
}

export function checkSupabaseEnvVars(): {
  urlExists: boolean
  keyExists: boolean
  isPlaceholder: boolean
} {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const urlExists = !!supabaseUrl
  const keyExists = !!supabaseAnonKey
  const isPlaceholder = 
    (supabaseUrl ? supabaseUrl.includes("your-supabase-url") : false) || 
    (supabaseAnonKey ? supabaseAnonKey.includes("your-supabase-anon-key") : false)

  return {
    urlExists,
    keyExists,
    isPlaceholder,
  }
}

// Export an explicit function to refresh the session
export async function refreshSession() {
  try {
    if (!supabase) {
      console.error("Cannot refresh session - Supabase client not initialized");
      return false;
    }
    
    console.log("Attempting to refresh Supabase session...");
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      console.error("Failed to refresh session:", error);
      return false;
    }
    
    if (data.session) {
      console.log("Session refreshed successfully");
      return true;
    } else {
      console.warn("No session available to refresh");
      return false;
    }
  } catch (error) {
    console.error("Error in refreshSession:", error);
    return false;
  }
}

// A more robust way to get the user with multiple fallbacks
export async function robustGetUser(): Promise<any | null> {
  if (!supabase) {
    console.warn("Supabase client not initialized");
    return null;
  }

  try {
    // Try with getSession first
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn("Error getting session:", sessionError.message);
    } else if (sessionData?.session?.user) {
      return sessionData.session.user;
    }
    
    // If that fails, try with getUser
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.warn("Error getting user:", userError.message);
    } else if (userData?.user) {
      return userData.user;
    }
    
    // As a last resort, try to refresh the session
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError) {
      console.warn("Error refreshing session:", refreshError.message);
    } else if (refreshData?.session?.user) {
      return refreshData.session.user;
    }
    
    console.warn("No user found after all attempts");
    return null;
  } catch (error) {
    console.error("Error in robustGetUser:", error);
    return null;
  }
}

