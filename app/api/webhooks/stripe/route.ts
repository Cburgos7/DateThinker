import { type NextRequest, NextResponse } from "next/server"
import type { Stripe } from "stripe"
import { getStripe } from "@/lib/stripe"
import { updateUserSubscription } from "@/lib/supabase"

// This is your Stripe webhook secret for testing your endpoint locally.
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get("stripe-signature") as string

    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
    }

    if (!signature) {
      return NextResponse.json({ error: "No signature provided" }, { status: 400 })
    }

    const stripe = getStripe()
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Webhook signature verification failed" }, { status: 400 })
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session

        // Retrieve the subscription details
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

          // Get the customer metadata to find the user ID
          const customer = await stripe.customers.retrieve(subscription.customer as string)

          if (!customer.deleted && customer.metadata.userId) {
            const userId = customer.metadata.userId

            // Calculate expiry date
            const expiryDate = new Date(subscription.current_period_end * 1000).toISOString()

            // Update the user's subscription status
            await updateUserSubscription(userId, "premium", expiryDate)
          }
        } else if (session.mode === "payment") {
          // Handle one-time payment (lifetime)
          const customer = await stripe.customers.retrieve(session.customer as string)

          if (!customer.deleted && customer.metadata.userId) {
            const userId = customer.metadata.userId

            // Update the user's subscription status to lifetime
            await updateUserSubscription(userId, "lifetime")
          }
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice

        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)

          const customer = await stripe.customers.retrieve(subscription.customer as string)

          if (!customer.deleted && customer.metadata.userId) {
            const userId = customer.metadata.userId

            // Calculate new expiry date
            const expiryDate = new Date(subscription.current_period_end * 1000).toISOString()

            // Update the user's subscription expiry
            await updateUserSubscription(userId, "premium", expiryDate)
          }
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription

        const customer = await stripe.customers.retrieve(subscription.customer as string)

        if (!customer.deleted && customer.metadata.userId) {
          const userId = customer.metadata.userId

          // Downgrade the user to free
          await updateUserSubscription(userId, "free")
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Error handling webhook:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}

