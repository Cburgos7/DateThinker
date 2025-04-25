import { NextResponse, type NextRequest } from "next/server"
import { getStripe } from "@/lib/stripe"
import { robustGetUser } from "@/lib/supabase"

// Price IDs from your Stripe dashboard
const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_SUBSCRIPTION_PRICE_ID || ""

export async function GET(req: NextRequest) {
  try {
    // Get the user if possible
    const user = await robustGetUser()
    const email = user?.email || "";
    
    // If we have an email but no user ID, try to get it from query parameters
    const url = new URL(req.url);
    const manualEmail = url.searchParams.get('email');
    
    if (!email && manualEmail) {
      console.log(`Using manual email from query param: ${manualEmail}`);
    }
    
    // Create a checkout without requiring user details
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const successUrl = `${baseUrl}/account?success=subscription`
    const cancelUrl = `${baseUrl}/pricing?canceled=true`
    
    // Set up minimal parameters for Stripe checkout
    const stripe = getStripe()
    const checkoutSession = await stripe.checkout.sessions.create({
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
      // Use the user email if we have it
      customer_email: email || manualEmail || undefined,
      // Store user ID in metadata if we have it
      metadata: {
        userId: user?.id || "manual-checkout",
        email: email || manualEmail || ""
      }
    })

    if (!checkoutSession || !checkoutSession.url) {
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
    }

    // Redirect to the checkout URL
    return NextResponse.redirect(checkoutSession.url)
  } catch (error) {
    console.error("Error creating direct checkout:", error)
    return NextResponse.json({ 
      error: "Failed to create checkout", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
} 