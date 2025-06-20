require('dotenv').config({ path: '.env' });
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


// Test command to run:
// node scripts/create-test-checkout-event.js

async function createTestCheckoutEvent() {
  try {
    // Verify API key is loaded
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not found. Make sure .env.local file exists and contains STRIPE_SECRET_KEY.');
    }

    // Create a test customer first
    const customer = await stripe.customers.create({
      email: 'burgoschris7@gmail.com',
      name: 'Christopher Burgos',
      metadata: {
        userId: 'e98da408-ca36-4b92-8132-a15e7d34ef57'
      }
    });

    console.log('Created test customer:', customer.id);

    // Create a test product and price
    const product = await stripe.products.create({
      name: 'Test Subscription',
    });

    const price = await stripe.prices.create({
      unit_amount: 499,
      currency: 'usd',
      recurring: { interval: 'month' },
      product: product.id,
    });

    console.log('Created test product and price');

    // Create a checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: 'https://datethinker.com/account?success=subscription',
      cancel_url: 'https://datethinker.com/pricing?canceled=true',
      metadata: {
        userId: 'e98da408-ca36-4b92-8132-a15e7d34ef57',
        email: 'burgoschris7@gmail.com'
      }
    });

    console.log('Created test checkout session:', session.id);

    // Now simulate completing it by creating a subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      metadata: {
        checkoutSessionId: session.id
      }
    });

    console.log('Created test subscription:', subscription.id);

    // Update the session to mark it as completed
    // Note: In real life, this happens automatically when payment succeeds
    console.log('\n🧪 Test Setup Complete!');
    console.log(`Customer ID: ${customer.id}`);
    console.log(`Session ID: ${session.id}`);
    console.log(`Subscription ID: ${subscription.id}`);
    console.log('\nNow you can manually trigger a checkout.session.completed webhook event');
    console.log('using the Stripe CLI or dashboard with this session ID.');

  } catch (error) {
    console.error('Error creating test checkout:', error.message);
  }
}

createTestCheckoutEvent(); 