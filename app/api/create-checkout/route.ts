import { NextResponse, type NextRequest } from "next/server"
import { getStripe, getOrCreateCustomer } from "@/lib/stripe"

// Price IDs from your Stripe dashboard
const SUBSCRIPTION_PRICE_ID = process.env.STRIPE_SUBSCRIPTION_PRICE_ID || ""
const LIFETIME_PRICE_ID = process.env.STRIPE_LIFETIME_PRICE_ID || ""

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { userId, userEmail, type } = data
    
    if (!userId || !userEmail) {
      return NextResponse.json({ error: "Missing user information" }, { status: 400 })
    }
    
    // Determine which price to use
    const priceId = type === 'lifetime' ? LIFETIME_PRICE_ID : SUBSCRIPTION_PRICE_ID
    
    if (!priceId) {
      return NextResponse.json({ error: "Price ID not configured" }, { status: 500 })
    }
    
    // Create a checkout without requiring user details
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
    const successUrl = `${baseUrl}/account?success=${type === 'lifetime' ? 'lifetime' : 'subscription'}`
    const cancelUrl = `${baseUrl}/pricing?canceled=true`
    
    // Get or create Stripe customer
    const customerId = await getOrCreateCustomer(userId, userEmail)
    
    if (!customerId) {
      return NextResponse.json({ error: "Failed to create/retrieve Stripe customer" }, { status: 500 })
    }
    
    // Set up minimal parameters for Stripe checkout
    const stripe = getStripe()
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: type === 'lifetime' ? "payment" : "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: "auto",
      metadata: {
        userId,
        email: userEmail
      },
      allow_promotion_codes: true
    })

    if (!checkoutSession?.url) {
      return NextResponse.json({ error: "No checkout URL in session response" }, { status: 500 })
    }

    console.log("Created checkout session, returning URL:", checkoutSession.url)
    
    // Return the URL to the client
    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error("Error creating checkout:", error)
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 })
  }
} 