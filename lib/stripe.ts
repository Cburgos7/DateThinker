import { Stripe } from "stripe"
import { loadStripe } from "@stripe/stripe-js"

// Initialize Stripe with your secret key
let stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Missing Stripe secret key")
    }

    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16", // API version for Stripe package v14.7.0
    })
  }

  return stripe
}

// Initialize Stripe on the client side
let stripePromise: Promise<any>

export const getClientStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
  }
  return stripePromise
}

// Create a Stripe checkout session for subscription
export async function createSubscriptionCheckout(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<string | null> {
  try {
    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return session.url
  } catch (error) {
    console.error("Error creating subscription checkout:", error)
    return null
  }
}

// Create a Stripe checkout session for one-time payment (lifetime)
export async function createOneTimeCheckout(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<string | null> {
  try {
    const stripe = getStripe()

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return session.url
  } catch (error) {
    console.error("Error creating one-time checkout:", error)
    return null
  }
}

// Create or retrieve a Stripe customer
export async function getOrCreateCustomer(userId: string, email: string, name?: string): Promise<string | null> {
  try {
    const stripe = getStripe()

    // Special case for unknown user ID - just use email to find or create customer
    const isUnknownUser = userId === "unknown" || userId === "form-checkout" || userId === "manual-checkout";

    // Search for existing customer by email
    const customers = await stripe.customers.list({
      email,
      limit: 1,
    })

    if (customers.data.length > 0) {
      // Update the customer with the user ID if needed (and if we have a valid one)
      if (!customers.data[0].metadata.userId && !isUnknownUser) {
        console.log(`Updating existing customer ${customers.data[0].id} with userId ${userId}`);
        await stripe.customers.update(customers.data[0].id, {
          metadata: { userId },
        })
      }
      return customers.data[0].id
    }

    // Create new customer
    console.log(`Creating new Stripe customer for ${isUnknownUser ? 'unknown user' : userId} with email ${email}`);
    const customerData: any = {
      email,
      name: name || undefined,
    };
    
    // Only add userId metadata if we have a valid one
    if (!isUnknownUser) {
      customerData.metadata = { userId };
    }
    
    const customer = await stripe.customers.create(customerData);

    return customer.id
  } catch (error) {
    console.error("Error getting or creating customer:", error)
    return null
  }
}

