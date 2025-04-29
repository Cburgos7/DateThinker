const { Stripe } = require('stripe');
require('dotenv').config();

async function setupStripeProducts() {
  console.log('🔧 Setting up Stripe test products and prices');
  
  try {
    // Initialize Stripe
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('Missing Stripe secret key');
    }
    
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });
    
    // Create Monthly Subscription Product
    console.log('Creating monthly subscription product...');
    const subscriptionProduct = await stripe.products.create({
      name: 'DateThinker Premium (Monthly)',
      description: 'Monthly subscription to DateThinker Premium features',
      active: true,
    });
    console.log(`✅ Created product: ${subscriptionProduct.id}`);
    
    // Create Monthly Subscription Price
    const subscriptionPrice = await stripe.prices.create({
      product: subscriptionProduct.id,
      unit_amount: 499, // $4.99
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      nickname: 'Monthly Subscription',
    });
    console.log(`✅ Created subscription price: ${subscriptionPrice.id}`);
    
    // Create Lifetime Product
    console.log('Creating lifetime product...');
    const lifetimeProduct = await stripe.products.create({
      name: 'DateThinker Lifetime',
      description: 'Lifetime access to DateThinker Premium features',
      active: true,
    });
    console.log(`✅ Created product: ${lifetimeProduct.id}`);
    
    // Create Lifetime Price
    const lifetimePrice = await stripe.prices.create({
      product: lifetimeProduct.id,
      unit_amount: 9900, // $99.00
      currency: 'usd',
      nickname: 'Lifetime Access',
    });
    console.log(`✅ Created lifetime price: ${lifetimePrice.id}`);
    
    // Update .env file values
    console.log('\n✅ Setup completed!');
    console.log('\nPlease update your .env file with the following values:');
    console.log(`STRIPE_SUBSCRIPTION_PRICE_ID=${subscriptionPrice.id}`);
    console.log(`STRIPE_LIFETIME_PRICE_ID=${lifetimePrice.id}`);
    
  } catch (error) {
    console.error('\n❌ Setup failed:');
    console.error(error);
  }
}

setupStripeProducts(); 