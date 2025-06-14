require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testWebhookWithRealCustomer() {
  try {
    console.log('Creating test customer with real data...');
    
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not found in environment variables');
    }
    
    // Create a customer that matches the actual user
    const customer = await stripe.customers.create({
      email: 'burgoschris7@gmail.com', // Your email from the Supabase database
      metadata: {
        userId: 'e98da408-ca36-4b92-8132-a15e7d34ef57' // Complete UUID provided by user
      }
    });
    
    console.log('Created customer:', customer.id);
    
    // Create a test subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID
      }],
      payment_behavior: 'default_incomplete'
    });
    
    console.log('Created subscription:', subscription.id);
    
    // Now create a test checkout session that references this customer
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: 'http://localhost:3000/account?success=subscription',
      cancel_url: 'http://localhost:3000/pricing?canceled=true',
      metadata: {
        userId: 'e98da408-ca36-4b92-8132-a15e7d34ef57',
        email: 'burgoschris7@gmail.com'
      }
    });
    
    console.log('Created checkout session:', checkoutSession.id);
    
    console.log('\n🎯 Test Instructions:');
    console.log('1. Your webhook should now be able to process events for this customer');
    console.log('2. Customer email:', customer.email);
    console.log('3. Customer ID:', customer.id);
    console.log('4. User ID in metadata:', customer.metadata.userId);
    console.log('\nNow trigger a test event with this specific session:');
    console.log(`stripe trigger checkout.session.completed --add checkout_session:customer=${customer.id}`);
    console.log('\n✅ This UUID should be valid for PostgreSQL!');
    
  } catch (error) {
    console.error('Error creating test data:', error.message);
  }
}

testWebhookWithRealCustomer(); 