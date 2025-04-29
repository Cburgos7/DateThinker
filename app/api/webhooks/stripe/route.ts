import { type NextRequest, NextResponse } from "next/server"
import type { Stripe } from "stripe"
import { getStripe } from "@/lib/stripe"
import { updateUserSubscription } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"

// This is your Stripe webhook secret for testing your endpoint locally.
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

// Helper function to safely find a user by email
async function findUserByEmail(email: string): Promise<string | null> {
  if (!supabase) {
    console.error("Supabase client not initialized");
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1);
    
    if (error) {
      console.error("Error finding user by email:", error);
      return null;
    }
    
    if (data && data.length > 0) {
      return data[0].id;
    }
    
    return null;
  } catch (error) {
    console.error("Exception when finding user by email:", error);
    return null;
  }
}

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

    console.log(`Webhook event received: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Processing checkout.session.completed: ${session.id}`)

        try {
          // Retrieve the subscription details
          if (session.mode === "subscription" && session.subscription) {
            const subscription = await stripe.subscriptions.retrieve(session.subscription as string)

            // Get the customer metadata to find the user ID
            const customerResponse = await stripe.customers.retrieve(subscription.customer as string)

            if (!customerResponse.deleted) {
              const customer = customerResponse as Stripe.Customer
              let userId = customer.metadata?.userId;
              let customerEmail = customer.email;
              
              // If userId is missing in metadata but we have an email, try to find the user by email
              if (!userId && customerEmail) {
                console.log(`No userId in metadata, attempting to find user by email: ${customerEmail}`);
                const foundUserId = await findUserByEmail(customerEmail);
                
                if (foundUserId) {
                  userId = foundUserId;
                  console.log(`Found user ${userId} by email ${customerEmail}`);
                  
                  // Update customer metadata with userId for future use
                  await stripe.customers.update(customer.id, {
                    metadata: { 
                      ...customer.metadata,
                      userId: userId 
                    }
                  });
                }
              }
              
              // If we still don't have a userId but session has customer_email, try that
              if (!userId && session.customer_email) {
                console.log(`Trying to find user by session email: ${session.customer_email}`);
                const foundUserId = await findUserByEmail(session.customer_email);
                
                if (foundUserId) {
                  userId = foundUserId;
                  console.log(`Found user ${userId} by session email ${session.customer_email}`);
                  
                  // Update customer metadata
                  await stripe.customers.update(customer.id, {
                    metadata: { 
                      ...customer.metadata,
                      userId: userId 
                    }
                  });
                }
              }
              
              // If we found a userId, update the subscription
              if (userId) {
                // Calculate expiry date - end of the current period
                const expiryDate = new Date(subscription.current_period_end * 1000)
                
                // Set the time to the end of the day
                expiryDate.setHours(23, 59, 59, 999)
                
                console.log(`Setting premium subscription for user ${userId} until ${expiryDate.toISOString()}`)

                // Update the user's subscription status
                await updateUserSubscription(userId, "premium", expiryDate.toISOString(), customer.id)
              } else {
                console.log(`Could not find a user to associate with this subscription. Email: ${customerEmail || session.customer_email || 'none'}, metadata:`, customer.metadata);
              }
            }
          } else if (session.mode === "payment") {
            // Handle one-time payment (lifetime)
            const customerResponse = await stripe.customers.retrieve(session.customer as string)

            if (!customerResponse.deleted) {
              const customer = customerResponse as Stripe.Customer
              let userId = customer.metadata?.userId;
              let customerEmail = customer.email;
              
              // If userId is missing but we have email, try to find the user
              if (!userId && customerEmail) {
                console.log(`No userId in metadata for lifetime purchase, attempting to find user by email: ${customerEmail}`);
                const foundUserId = await findUserByEmail(customerEmail);
                
                if (foundUserId) {
                  userId = foundUserId;
                  console.log(`Found user ${userId} by email ${customerEmail}`);
                  
                  // Update customer metadata with userId for future use
                  await stripe.customers.update(customer.id, {
                    metadata: { 
                      ...customer.metadata,
                      userId: userId 
                    }
                  });
                }
              }
              
              // If we still don't have a userId but session has customer_email, try that
              if (!userId && session.customer_email) {
                console.log(`Trying to find user by session email: ${session.customer_email}`);
                const foundUserId = await findUserByEmail(session.customer_email);
                
                if (foundUserId) {
                  userId = foundUserId;
                  console.log(`Found user ${userId} by session email ${session.customer_email}`);
                  
                  // Update customer metadata
                  await stripe.customers.update(customer.id, {
                    metadata: { 
                      ...customer.metadata,
                      userId: userId 
                    }
                  });
                }
              }
              
              if (userId) {
                console.log(`Setting lifetime subscription for user ${userId}`)

                // Update the user's subscription status to lifetime
                await updateUserSubscription(userId, "lifetime", null, customer.id)
              } else {
                console.log(`Could not find a user to associate with this lifetime purchase. Email: ${customerEmail || session.customer_email || 'none'}, metadata:`, customer.metadata);
              }
            }
          }
        } catch (error) {
          console.error("Error processing checkout session:", error)
        }
        break
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice
        console.log(`Processing invoice.payment_succeeded: ${invoice.id}`)

        try {
          if (invoice.subscription) {
            const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)

            const customerResponse = await stripe.customers.retrieve(subscription.customer as string)

            if (!customerResponse.deleted) {
              const customer = customerResponse as Stripe.Customer
              let userId = customer.metadata?.userId;
              
              // If userId is missing but we have email, try to find the user
              if (!userId && customer.email) {
                console.log(`No userId in metadata for invoice, attempting to find user by email: ${customer.email}`);
                const foundUserId = await findUserByEmail(customer.email);
                
                if (foundUserId) {
                  userId = foundUserId;
                  console.log(`Found user ${userId} by email ${customer.email}`);
                  
                  // Update customer metadata with userId for future use
                  await stripe.customers.update(customer.id, {
                    metadata: { 
                      ...customer.metadata,
                      userId: userId 
                    }
                  });
                }
              }
              
              if (userId) {
                // Calculate new expiry date - end of the current period
                const expiryDate = new Date(subscription.current_period_end * 1000)
                
                // Set the time to the end of the day
                expiryDate.setHours(23, 59, 59, 999)
                
                console.log(`Updating premium subscription for user ${userId} until ${expiryDate.toISOString()}`)

                // Update the user's subscription expiry
                await updateUserSubscription(userId, "premium", expiryDate.toISOString(), customer.id)
              }
            }
          }
        } catch (error) {
          console.error("Error processing invoice payment:", error)
        }
        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`Processing customer.subscription.updated: ${subscription.id}`)

        try {
          const customerResponse = await stripe.customers.retrieve(subscription.customer as string)

          if (!customerResponse.deleted) {
            const customer = customerResponse as Stripe.Customer
            let userId = customer.metadata?.userId;
            
            // If userId is missing but we have email, try to find the user
            if (!userId && customer.email) {
              console.log(`No userId in metadata for subscription update, attempting to find user by email: ${customer.email}`);
              const foundUserId = await findUserByEmail(customer.email);
              
              if (foundUserId) {
                userId = foundUserId;
                console.log(`Found user ${userId} by email ${customer.email}`);
                
                // Update customer metadata with userId for future use
                await stripe.customers.update(customer.id, {
                  metadata: { 
                    ...customer.metadata,
                    userId: userId 
                  }
                });
              }
            }
            
            if (userId) {
              // Check if cancel_at_period_end is true
              if (subscription.cancel_at_period_end) {
                console.log(`Subscription ${subscription.id} scheduled to cancel at period end: ${new Date(subscription.current_period_end * 1000).toISOString()}`)
                
                // Don't change the status yet, just log that it's scheduled to cancel
              } else if (subscription.status === 'active') {
                // Subscription is active (or reactivated)
                const expiryDate = new Date(subscription.current_period_end * 1000)
                expiryDate.setHours(23, 59, 59, 999)
                
                console.log(`Subscription is active. Updating to premium until ${expiryDate.toISOString()}`)
                await updateUserSubscription(userId, "premium", expiryDate.toISOString(), customer.id)
              }
            }
          }
        } catch (error) {
          console.error("Error processing subscription update:", error)
        }
        break
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription
        console.log(`Processing customer.subscription.deleted: ${subscription.id}`)

        try {
          const customerResponse = await stripe.customers.retrieve(subscription.customer as string)

          if (!customerResponse.deleted) {
            const customer = customerResponse as Stripe.Customer
            let userId = customer.metadata?.userId;
            
            // If userId is missing but we have email, try to find the user
            if (!userId && customer.email) {
              console.log(`No userId in metadata for subscription deletion, attempting to find user by email: ${customer.email}`);
              const foundUserId = await findUserByEmail(customer.email);
              
              if (foundUserId) {
                userId = foundUserId;
                console.log(`Found user ${userId} by email ${customer.email}`);
              }
            }
            
            if (userId) {
              console.log(`Downgrading user ${userId} to free plan`)

              // Downgrade the user to free
              await updateUserSubscription(userId, "free", null, customer.id)
            }
          }
        } catch (error) {
          console.error("Error processing subscription deletion:", error)
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

