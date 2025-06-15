require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testWebhookWithRealCustomer() {
  try {
    console.log('Testing lifetime purchase webhook...');
    
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not found in environment variables');
    }
    if (!process.env.STRIPE_LIFETIME_PRICE_ID) {
      throw new Error('STRIPE_LIFETIME_PRICE_ID not found in environment variables');
    }
    
    const testEmail = 'burgoschris7@gmail.com';
    
    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: testEmail,
      limit: 1
    });
    
    let customer;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      console.log('Found existing customer:', customer.id);
      
      // Update metadata to ensure userId is set
      await stripe.customers.update(customer.id, {
        metadata: {
          userId: 'e98da408-ca36-4b92-8132-a15e7d34ef57',
          subscriptionStatus: 'lifetime'
        }
      });
      console.log('Updated customer metadata with userId');
    } else {
      // Create a customer
      customer = await stripe.customers.create({
        email: testEmail,
        name: 'Test User',
        metadata: {
          userId: 'e98da408-ca36-4b92-8132-a15e7d34ef57',
          subscriptionStatus: 'lifetime'
        }
      });
      console.log('Created new customer:', customer.id);
    }
    
    // Create a checkout session for lifetime purchase
    console.log('Creating checkout session for lifetime purchase...');
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [{
        price: process.env.STRIPE_LIFETIME_PRICE_ID,
        quantity: 1,
      }],
      mode: 'payment', // One-time payment for lifetime
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      metadata: {
        subscriptionType: 'lifetime',
        userId: 'e98da408-ca36-4b92-8132-a15e7d34ef57'
      }
    });
    
    console.log('Created checkout session:', session.id);
    
    // Now use Stripe CLI to trigger the completion
    console.log('\n🎯 To complete the test, run this command:');
    console.log(`stripe events resend ${session.id}`);
    console.log('\nOR manually trigger:');
    console.log(`stripe trigger checkout.session.completed --add checkout_session:customer=${customer.id} --add checkout_session:mode=payment`);
    
    console.log('\n✅ Test setup completed!');
    console.log('Customer ID:', customer.id);
    console.log('Session ID:', session.id);
    console.log('User ID in metadata:', customer.metadata.userId);
    
    return { customer, session };
    
  } catch (error) {
    console.error('Error creating test data:', error.message);
    throw error;
  }
}

testWebhookWithRealCustomer()
  .then(() => {
    console.log('✅ Test setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });