const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testWebhookManually() {
  try {
    // Create a test customer first
    const customer = await stripe.customers.create({
      email: 'test@example.com',
      metadata: {
        userId: 'test-user-123'
      }
    });
    
    console.log('Created test customer:', customer.id);
    
    // Create a subscription for testing
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID
      }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
    
    console.log('Created test subscription:', subscription.id);
    
    // Now manually create a webhook event payload
    const webhookPayload = {
      id: 'evt_test_webhook',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_manual',
          mode: 'subscription',
          customer: customer.id,
          customer_email: 'test@example.com',
          subscription: subscription.id,
          metadata: {
            userId: 'test-user-123'
          }
        }
      }
    };
    
    console.log('Test webhook payload created');
    console.log('Customer ID:', customer.id);
    console.log('Subscription ID:', subscription.id);
    console.log('\nYou can now test this by:');
    console.log('1. Ensuring your webhook handler can process this customer');
    console.log('2. Using Stripe CLI: stripe trigger checkout.session.completed');
    console.log('3. Or sending POST to http://localhost:3000/api/webhooks/stripe');
    
  } catch (error) {
    console.error('Error creating test data:', error.message);
  }
}

testWebhookManually(); 