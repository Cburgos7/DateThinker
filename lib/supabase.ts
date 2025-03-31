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
    const siteUrl = getSiteUrl()

    // Log configuration for debugging
    console.log("Creating Supabase client with:", {
      urlExists: !!supabaseUrl,
      keyExists: !!supabaseAnonKey,
      siteUrl,
    })

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables")
      return null
    }

    // Ensure URL is properly formatted with https://
    const formattedUrl = supabaseUrl.startsWith("https://") ? supabaseUrl : `https://${supabaseUrl}`

    // Create client with more robust options
    return createClient<Database>(formattedUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        // Add the site URL for redirects
        redirectTo: `${siteUrl}/auth/callback`,
      },
      global: {
        headers: {
          "X-Client-Info": "datethinker-web-app",
        },
      },
    })
  } catch (error) {
    console.error("Error creating Supabase client:", error)
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
export async function getCurrentUser(): Promise<UserWithSubscription | null> {
  try {
    // If supabase client isn't initialized, return null
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return null
    }

    // First check if we have a session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError) {
      console.error("Error getting session:", sessionError)
      return null
    }

    // If no session exists, return null without trying to get the user
    if (!sessionData.session) {
      console.log("No active session found")
      return null
    }

    // Now that we know we have a session, get the user
    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError) {
      console.error("Error getting user:", userError)
      return null
    }

    if (!userData.user) {
      console.log("No user data found despite having a session")
      return null
    }

    // Get the user's profile with subscription info
    try {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userData.user.id)
        .single()

      if (profileError) {
        // If the profile doesn't exist yet, we might need to create it
        if (profileError.code === "PGRST116") {
          // Create a default profile for the user
          const defaultProfile = {
            id: userData.user.id,
            full_name: userData.user.email?.split("@")[0] || null,
            avatar_url: null,
            subscription_status: "free",
          }

          const { error: insertError } = await supabase.from("profiles").insert(defaultProfile)

          if (insertError) {
            console.error("Error creating profile:", insertError)
          }

          return {
            id: userData.user.id,
            email: userData.user.email!,
            full_name: userData.user.email?.split("@")[0] || null,
            avatar_url: null,
            subscription_status: "free",
            subscription_expiry: null,
            stripe_customer_id: null,
            created_at: undefined,
          }
        } else {
          console.error("Error getting profile:", profileError)
          return {
            id: userData.user.id,
            email: userData.user.email!,
            full_name: userData.user.email?.split("@")[0] || null,
            avatar_url: null,
            subscription_status: "free",
            subscription_expiry: null,
            stripe_customer_id: null,
            created_at: undefined,
          }
        }
      }

      if (!profile) {
        return {
          id: userData.user.id,
          email: userData.user.email!,
          full_name: userData.user.email?.split("@")[0] || null,
          avatar_url: null,
          subscription_status: "free",
          subscription_expiry: null,
          stripe_customer_id: null,
          created_at: undefined,
        }
      }

      return {
        id: userData.user.id,
        email: userData.user.email!,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        subscription_status: profile.subscription_status || "free",
        subscription_expiry: profile.subscription_expiry,
        stripe_customer_id: profile.stripe_customer_id,
        created_at: profile.created_at,
      }
    } catch (profileError) {
      console.error("Error in profile handling:", profileError)
      return {
        id: userData.user.id,
        email: userData.user.email!,
        full_name: userData.user.email?.split("@")[0] || null,
        avatar_url: null,
        subscription_status: "free",
        subscription_expiry: null,
        stripe_customer_id: null,
        created_at: undefined,
      }
    }
  } catch (error) {
    console.error("Error getting current user:", error)
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
    if (!supabase) {
      console.warn("Supabase client not initialized - missing environment variables")
      return false
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        subscription_status: subscriptionStatus,
        subscription_expiry: subscriptionExpiry,
        stripe_customer_id: stripeCustomerId,
      })
      .eq("id", userId)

    if (error) {
      console.error("Error updating subscription:", error)
      return false
    }

    return true
  } catch (error) {
    console.error("Error in updateUserSubscription:", error)
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
  const isPlaceholder = supabaseAnonKey ? supabaseAnonKey.includes("your-supabase-anon-key") : false

  return {
    urlExists,
    keyExists,
    isPlaceholder,
  }
}

