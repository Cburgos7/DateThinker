import PocketBase from "pocketbase"

// Create a singleton instance of PocketBase
let pb: PocketBase | null = null

export function getPocketBase() {
  if (!pb) {
    // Initialize PocketBase with your instance URL
    pb = new PocketBase(process.env.NEXT_PUBLIC_POCKETBASE_URL)
  }
  return pb
}

// Types for user data
export interface UserData {
  id: string
  email: string
  name?: string
  avatar?: string
  created: string
  updated: string
  verified: boolean
  subscriptionStatus?: "free" | "premium" | "lifetime"
  subscriptionExpiry?: string
  stripeCustomerId?: string
}

// Get the current authenticated user
export async function getCurrentUser(): Promise<UserData | null> {
  const pb = getPocketBase()

  if (!pb.authStore.isValid) {
    return null
  }

  try {
    // Refresh the auth to ensure it's still valid
    await pb.collection("users").authRefresh()

    const userData = pb.authStore.model

    if (!userData) {
      return null
    }

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar,
      created: userData.created,
      updated: userData.updated,
      verified: userData.verified,
      subscriptionStatus: userData.subscriptionStatus || "free",
      subscriptionExpiry: userData.subscriptionExpiry,
      stripeCustomerId: userData.stripeCustomerId,
    }
  } catch (error) {
    console.error("Error getting current user:", error)
    pb.authStore.clear()
    return null
  }
}

// Update user subscription status
export async function updateUserSubscription(
  userId: string,
  status: "free" | "premium" | "lifetime",
  expiryDate?: string,
): Promise<boolean> {
  const pb = getPocketBase()

  try {
    await pb.collection("users").update(userId, {
      subscriptionStatus: status,
      subscriptionExpiry: expiryDate || null,
    })
    return true
  } catch (error) {
    console.error("Error updating user subscription:", error)
    return false
  }
}

