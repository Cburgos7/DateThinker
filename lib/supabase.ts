import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Update the getSiteUrl function to always use your production domain
export function getSiteUrl() {
  // Use the environment variable if available, otherwise fallback to the hardcoded URL
  return process.env.NEXT_PUBLIC_BASE_URL || "https://datethinker.com"
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Types for user data with subscription info
export type UserWithSubscription = {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  subscription_status: "free" | "premium" | "pro"
  subscription_expiry: string | null
  stripe_customer_id: string | null
}

// Get the current authenticated user with subscription info
export async function getCurrentUser(): Promise<UserWithSubscription | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    if (!user) return null

    // Get the user's profile with subscription info
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError) {
      console.error("Error getting profile:", profileError)
      return null
    }

    return {
      id: user.id,
      email: user.email!,
      full_name: profile?.full_name || user.email?.split("@")[0] || null,
      avatar_url: profile?.avatar_url || null,
      subscription_status: profile?.subscription_status || "free",
      subscription_expiry: profile?.subscription_expiry || null,
      stripe_customer_id: profile?.stripe_customer_id || null,
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

