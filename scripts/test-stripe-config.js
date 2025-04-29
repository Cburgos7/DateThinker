const { Stripe } = require('stripe');
require('dotenv').config();

// Create a test function to validate Stripe setup
async function testStripeConfig() {
  console.log('🔍 Testing Stripe Configuration');
  
  try {
    // Verify API key format
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    console.log(`Secret Key Format: ${stripeSecretKey ? (stripeSecretKey.startsWith('sk_test_') ? '✅ Test key' : '⚠️ Not a test key') : '❌ Missing'}`);
    
    const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    console.log(`Publishable Key Format: ${stripePublishableKey ? (stripePublishableKey.startsWith('pk_test_') ? '✅ Test key' : '⚠️ Not a test key') : '❌ Missing'}`);
    
    // Initialize Stripe
    if (!stripeSecretKey) {
      throw new Error('Missing Stripe secret key');
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
    
    // Test connection
    console.log('🔄 Testing Stripe API connection...');
    const account = await stripe.account.retrieve();
    console.log(`✅ Connected to Stripe account: ${account.id}`);
    
    // Check for price IDs
    const subscriptionPriceId = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;
    const lifetimePriceId = process.env.STRIPE_LIFETIME_PRICE_ID;
    
    console.log(`Subscription Price ID: ${subscriptionPriceId ? '✅ Set' : '❌ Missing'}`);
    console.log(`Lifetime Price ID: ${lifetimePriceId ? '✅ Set' : '❌ Missing'}`);
    
    // Validate price IDs by retrieving them
    if (subscriptionPriceId) {
      try {
        const price = await stripe.prices.retrieve(subscriptionPriceId);
        console.log(`✅ Subscription price validated: ${price.nickname || price.id} - ${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`);
      } catch (error) {
        console.log(`❌ Failed to retrieve subscription price: ${error.message}`);
      }
    }
    
    if (lifetimePriceId) {
      try {
        const price = await stripe.prices.retrieve(lifetimePriceId);
        console.log(`✅ Lifetime price validated: ${price.nickname || price.id} - ${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`);
      } catch (error) {
        console.log(`❌ Failed to retrieve lifetime price: ${error.message}`);
      }
    }
    
    // Check webhook secret
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    console.log(`Webhook Secret: ${webhookSecret ? (webhookSecret.startsWith('whsec_') ? '✅ Correct format' : '⚠️ Incorrect format') : '❌ Missing'}`);
    
    console.log('\n✅ Stripe configuration test completed');
    
  } catch (error) {
    console.error('\n❌ Stripe configuration test failed:');
    console.error(error);
  }
}

testStripeConfig(); 