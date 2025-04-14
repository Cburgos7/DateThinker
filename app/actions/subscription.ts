"use server"

import { redirect } from "next/navigation"
import { getCurrentUser, getUserWithSubscription, updateUserSubscription } from "@/lib/supabase"
import { getOrCreateCustomer, createSubscriptionCheckout, createOneTimeCheckout } from "@/lib/stripe"
import { getStripe } from "@/lib/stripe"
import { supabase } from "@/lib/supabase"

// Price IDs from your Stripe dashboard
const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_SUBSCRIPTION_PRICE_ID || ""
const LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID || ""

// Create a checkout session for monthly subscription
export async function createMonthlySubscription(formData: FormData) {
  const user = await getCurrentUser()
  const userWithSubscription = await getUserWithSubscription()

  // Validate the user is logged in
  const session = await supabase.auth.getSession()
  if (!session?.data?.session?.user) {
    redirect("/auth?redirect=/pricing")
    return { success: false, message: "Not authenticated" }
  }

  if (!user) {
    redirect("/login?redirect=/pricing")
  }

  // Get or create Stripe customer
  let customerId = userWithSubscription?.stripe_customer_id

  if (!customerId) {
    customerId = await getOrCreateCustomer(
      user.id, 
      user.email || "", 
      user.user_metadata?.full_name || undefined
    )

    if (!customerId) {
      throw new Error("Failed to create Stripe customer")
    }

    // Update Supabase user with Stripe customer ID
    await updateUserSubscription(
      user.id, 
      userWithSubscription?.subscription_status || "free", 
      userWithSubscription?.subscription_expiry || null, 
      customerId
    )
  }

  // Create checkout session
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  const successUrl = `${baseUrl}/account?success=subscription`
  const cancelUrl = `${baseUrl}/pricing?canceled=true`

  const checkoutUrl = await createSubscriptionCheckout(customerId, SUBSCRIPTION_PRICE_ID, successUrl, cancelUrl)

  if (!checkoutUrl) {
    throw new Error("Failed to create checkout session")
  }

  redirect(checkoutUrl)
}

// Create a checkout session for lifetime membership
export async function createLifetimeMembership(formData: FormData) {
  const user = await getCurrentUser()
  const userWithSubscription = await getUserWithSubscription()

  // Validate the user is logged in
  const session = await supabase.auth.getSession()
  if (!session?.data?.session?.user) {
    redirect("/auth?redirect=/pricing")
    return { success: false, message: "Not authenticated" }
  }

  if (!user) {
    redirect("/login?redirect=/pricing")
  }

  // Get or create Stripe customer
  let customerId = userWithSubscription?.stripe_customer_id

  if (!customerId) {
    customerId = await getOrCreateCustomer(
      user.id, 
      user.email || "", 
      user.user_metadata?.full_name || undefined
    )

    if (!customerId) {
      throw new Error("Failed to create Stripe customer")
    }

    // Update Supabase user with Stripe customer ID
    await updateUserSubscription(
      user.id, 
      userWithSubscription?.subscription_status || "free", 
      userWithSubscription?.subscription_expiry || null, 
      customerId
    )
  }

  // Create checkout session
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  const successUrl = `${baseUrl}/account?success=lifetime`
  const cancelUrl = `${baseUrl}/pricing?canceled=true`

  const checkoutUrl = await createOneTimeCheckout(customerId, LIFETIME_PRICE_ID, successUrl, cancelUrl)

  if (!checkoutUrl) {
    throw new Error("Failed to create checkout session")
  }

  redirect(checkoutUrl)
}

// Cancel subscription
export async function cancelSubscription() {
  const user = await getCurrentUser()
  const userWithSubscription = await getUserWithSubscription()

  if (!user || !userWithSubscription || !userWithSubscription.stripe_customer_id) {
    throw new Error("User not found or no subscription")
  }

  try {
    const stripe = getStripe()

    // Find active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: userWithSubscription.stripe_customer_id,
      status: "active",
    })

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found")
    }

    // Cancel the subscription
    await stripe.subscriptions.update(subscriptions.data[0].id, {
      cancel_at_period_end: true,
    })

    return { success: true }
  } catch (error) {
    console.error("Error canceling subscription:", error)
    throw new Error("Failed to cancel subscription")
  }
}

