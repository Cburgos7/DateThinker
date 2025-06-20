require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testWebhookWithMonthlySubscription() {
  try {
    console.log('Testing monthly subscription webhook...');
    
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not found in environment variables');
    }
    if (!process.env.STRIPE_SUBSCRIPTION_PRICE_ID) {
      throw new Error('STRIPE_SUBSCRIPTION_PRICE_ID not found in environment variables');
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
          subscriptionStatus: 'premium'
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
          subscriptionStatus: 'premium'
        }
      });
      console.log('Created new customer:', customer.id);
    }
    
    // Create a real subscription (this will trigger the right webhook events)
    console.log('Creating monthly subscription...');
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription'
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        subscriptionType: 'premium',
        userId: 'e98da408-ca36-4b92-8132-a15e7d34ef57'
      }
    });
    
    console.log('Created subscription:', subscription.id);
    
    // Simulate successful payment by confirming the payment intent with a test payment method
    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice.payment_intent;
    
    if (paymentIntent && paymentIntent.status === 'requires_payment_method') {
      console.log('Confirming payment intent with test payment method...');
      
      const confirmedPaymentIntent = await stripe.paymentIntents.confirm(paymentIntent.id, {
        payment_method: 'pm_card_visa', // Test payment method
        return_url: 'https://example.com/return'
      });
      
      console.log('Payment intent confirmed:', confirmedPaymentIntent.id);
      console.log('Payment status:', confirmedPaymentIntent.status);
    }
    
    console.log('\n✅ Test completed!');
    console.log('Customer ID:', customer.id);
    console.log('Subscription ID:', subscription.id);
    console.log('User ID in metadata:', customer.metadata.userId);
    console.log('Expected result: User should be updated to PREMIUM subscription');
    
    console.log('\n🔔 Webhook events that should be triggered:');
    console.log('   - customer.subscription.created');
    console.log('   - invoice.created');
    console.log('   - invoice.finalized');
    console.log('   - payment_intent.succeeded (when payment confirms)');
    console.log('   - invoice.payment_succeeded');
    console.log('   - customer.subscription.updated (when active)');
    
    return { customer, subscription };
    
  } catch (error) {
    console.error('Error creating test data:', error.message);
    throw error;
  }
}

testWebhookWithMonthlySubscription()
  .then(() => {
    console.log('✅ Test setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });