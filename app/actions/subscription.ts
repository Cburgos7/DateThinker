"use server"

import { redirect } from "next/navigation"
import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { createSubscriptionCheckout, createOneTimeCheckout, getOrCreateCustomer } from "@/lib/stripe"
import { getStripe } from "@/lib/stripe"
import { robustGetUser } from "@/lib/supabase"

// Price IDs from your Stripe dashboard
const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_SUBSCRIPTION_PRICE_ID || ""
const LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID || ""

// Create a checkout session for monthly subscription
export async function createMonthlySubscription(formData: FormData): Promise<void> {
  console.log("Creating Stripe checkout session...")

  let checkoutUrl: string | null = null;
  
  try {
    // Get user information from form data instead of session
    const userId = formData.get('userId') as string;
    const userEmail = formData.get('userEmail') as string;
    
    console.log(`Form data - userId: ${userId}, email: ${userEmail}`);
    
    if (!userId || !userEmail) {
      console.log("Missing user information in form data, attempting to get user from session as fallback");
      
      // As a fallback, try to get user with the robust method
      const user = await robustGetUser();
      
      if (!user?.id || !user?.email) {
        console.error("No user information available");
        redirect('/login?redirectTo=/pricing');
        return;
      }
    }

    if (!SUBSCRIPTION_PRICE_ID) {
      console.error("Stripe subscription price ID not configured");
      throw new Error("Subscription configuration error. Please contact support.");
    }
    
    // Create a checkout without requiring user details
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const successUrl = `${baseUrl}/account?success=subscription`
    const cancelUrl = `${baseUrl}/pricing?canceled=true`
    
    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(userId || "unknown", userEmail || "unknown");
    
    if (!customerId) {
      console.error("Failed to create/retrieve Stripe customer");
      throw new Error("Unable to process subscription. Please try again or contact support.");
    }
    
    // Set up minimal parameters for Stripe checkout
    const stripe = getStripe()
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: "auto",
      metadata: {
        userId: userId || "form-checkout",
        email: userEmail || ""
      },
      allow_promotion_codes: true
    })

    if (!checkoutSession?.url) {
      console.error("No checkout URL in session response");
      throw new Error("Unable to start checkout. Please try again.");
    }

    console.log("Redirecting to Stripe checkout:", checkoutSession.url)
    redirect(checkoutSession.url)
  } catch (error) {
    console.error("Error creating checkout:", error)
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes("authentication")) {
        redirect('/login?redirectTo=/pricing');
        return;
      }
    }
    
    // For other errors, redirect to pricing with error
    redirect('/pricing?error=checkout_failed');
  }
}

// Create a checkout session for lifetime membership
export async function createLifetimeMembership(formData: FormData): Promise<void> {
  console.log("Creating Stripe checkout session for lifetime membership...")

  let checkoutUrl: string | null = null;
  
  try {
    // Get user information from form data instead of session
    const userId = formData.get('userId') as string;
    const userEmail = formData.get('userEmail') as string;
    
    console.log(`Form data - userId: ${userId}, email: ${userEmail}`);
    
    if (!userId || !userEmail) {
      console.log("Missing user information in form data, attempting to get user from session as fallback");
      
      // As a fallback, try to get user with the robust method
      const user = await robustGetUser();
      
      if (!user?.id) {
        throw new Error("User information missing. Please try the direct checkout link below.");
      }
    }
    
    // Create a checkout without requiring user details
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const successUrl = `${baseUrl}/account?success=lifetime`
    const cancelUrl = `${baseUrl}/pricing?canceled=true`
    
    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(userId || "unknown", userEmail || "unknown");
    
    if (!customerId) {
      throw new Error("Failed to create or retrieve Stripe customer");
    }
    
    // Set up minimal parameters for Stripe checkout
    const stripe = getStripe()
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: LIFETIME_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: "auto",
      metadata: {
        userId: userId || "form-checkout",
        email: userEmail || ""
      }
    })

    if (!checkoutSession || !checkoutSession.url) {
      throw new Error("Failed to create checkout session")
    }

    console.log("Redirecting to Stripe checkout:", checkoutSession.url)
    checkoutUrl = checkoutSession.url;
  } catch (error) {
    console.error("Error creating checkout:", error)
    throw new Error("Failed to start checkout process: " + (error instanceof Error ? error.message : String(error)))
  }
  
  // Only redirect if we successfully got a checkout URL
  if (checkoutUrl) {
    redirect(checkoutUrl)
  }
}

// Cancel subscription 
export async function cancelSubscription() {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })
  
  try {
    // Try to get user with more robust method first
    const user = await robustGetUser();
    
    if (!user?.id) {
      // Fallback to standard session check
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        throw new Error("No active session found. Please log in and try again.");
      }
    }
    
    const userId = user?.id;
    
    if (!userId) {
      throw new Error("Could not determine user ID");
    }
    
    // Get user profile with subscription info
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, subscription_status, subscription_expiry')
      .eq('id', userId)
      .single()
      
    if (!profile?.stripe_customer_id) {
      throw new Error("No subscription found")
    }
    
    // Get Stripe instance
    const stripe = getStripe()
    
    // Find active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "active",
    })

    if (subscriptions.data.length === 0) {
      throw new Error("No active subscription found")
    }

    // Schedule the subscription to cancel at the period end
    const subscription = subscriptions.data[0]
    
    // Calculate the next first day of next month
    const currentDate = new Date()
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1) 
    
    console.log(`Canceling subscription ${subscription.id} at end of billing period. Access until: ${new Date(subscription.current_period_end * 1000).toISOString()}`)
    
    // Cancel the subscription at the end of the billing period
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    })
    
    // Note: The subscription status will be updated by the webhook when the subscription is actually canceled

    return { success: true, message: "Your subscription will be canceled at the end of the current billing period." }
  } catch (error) {
    console.error("Error canceling subscription:", error)
    throw new Error("Failed to cancel subscription: " + (error instanceof Error ? error.message : String(error)))
  }
}

