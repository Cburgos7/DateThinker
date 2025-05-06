import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  try {
    const stripe = getStripe();
    
    // Get pricing information
    const prices = {
      monthly: process.env.STRIPE_SUBSCRIPTION_PRICE_ID,
      lifetime: process.env.STRIPE_LIFETIME_PRICE_ID
    };
    
    const priceDetails = [];
    
    // Fetch price details if IDs are available
    if (prices.monthly) {
      try {
        const monthlyPrice = await stripe.prices.retrieve(prices.monthly);
        priceDetails.push({
          id: monthlyPrice.id,
          type: "monthly",
          amount: monthlyPrice.unit_amount,
          currency: monthlyPrice.currency,
          recurring: monthlyPrice.recurring,
          product: monthlyPrice.product
        });
      } catch (error) {
        console.error("Error retrieving monthly price:", error);
      }
    }
    
    if (prices.lifetime) {
      try {
        const lifetimePrice = await stripe.prices.retrieve(prices.lifetime);
        priceDetails.push({
          id: lifetimePrice.id,
          type: "lifetime",
          amount: lifetimePrice.unit_amount,
          currency: lifetimePrice.currency,
          product: lifetimePrice.product
        });
      } catch (error) {
        console.error("Error retrieving lifetime price:", error);
      }
    }
    
    return NextResponse.json({
      prices,
      priceDetails,
      hasStripeKeys: !!process.env.STRIPE_SECRET_KEY && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    });
    
  } catch (error) {
    console.error("Error fetching Stripe prices:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      hasStripeKeys: !!process.env.STRIPE_SECRET_KEY && !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    }, { status: 500 });
  }
} 