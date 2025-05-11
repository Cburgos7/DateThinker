import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  try {
    // Check environment variables
    const envStatus = {
      STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      STRIPE_SUBSCRIPTION_PRICE_ID: !!process.env.STRIPE_SUBSCRIPTION_PRICE_ID,
      STRIPE_LIFETIME_PRICE_ID: !!process.env.STRIPE_LIFETIME_PRICE_ID,
      STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET
    };

    // Check if required keys are present
    const hasRequiredKeys = envStatus.STRIPE_SECRET_KEY && envStatus.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!hasRequiredKeys) {
      return NextResponse.json({
        stripeStatus: "disconnected",
        envStatus,
        error: "Missing required Stripe environment variables"
      });
    }

    // Try to connect to Stripe
    try {
      const stripe = getStripe();
      const account = await stripe.accounts.retrieve('account');
      
      return NextResponse.json({
        stripeStatus: "connected",
        envStatus,
        account
      });
    } catch (stripeError) {
      return NextResponse.json({
        stripeStatus: "error",
        envStatus,
        error: stripeError instanceof Error ? stripeError.message : "Unknown Stripe error"
      });
    }
  } catch (error) {
    console.error("Error checking Stripe status:", error);
    return NextResponse.json({
      stripeStatus: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
} 