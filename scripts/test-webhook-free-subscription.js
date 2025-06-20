require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testWebhookWithFreeSubscription() {
  try {
    console.log('Testing subscription cancellation -> free user workflow...');
    
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY not found in environment variables');
    }
    if (!process.env.STRIPE_SUBSCRIPTION_PRICE_ID) {
      throw new Error('STRIPE_SUBSCRIPTION_PRICE_ID not found in environment variables');
    }
    
    const testEmail = 'test-free@example.com';
    
    // Check if customer already exists
    const existingCustomers = await stripe.customers.list({
      email: testEmail,
      limit: 1
    });
    
    let customer;
    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      console.log('Found existing customer:', customer.id);
      
      // Update metadata to show they're now free (after cancellation)
      await stripe.customers.update(customer.id, {
        metadata: {
          userId: 'e98da408-ca36-4b92-8132-a15e7d34ef57',
          subscriptionStatus: 'free'
        }
      });
      console.log('Updated customer metadata to free status');
    } else {
      // Create a customer
      customer = await stripe.customers.create({
        email: testEmail,
        metadata: {
          userId: 'e98da408-ca36-4b92-8132-a15e7d34ef57',
          subscriptionStatus: 'free'
        }
      });
      console.log('Created new customer:', customer.id);
    }
    
    // First, create a subscription (to simulate having had one)
    console.log('Creating subscription to cancel...');
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: process.env.STRIPE_SUBSCRIPTION_PRICE_ID
      }],
      payment_behavior: 'default_incomplete',
      metadata: {
        subscriptionStatus: 'active'
      }
    });
    
    console.log('Created subscription:', subscription.id);
    
    // Now cancel the subscription to simulate the cancellation event
    console.log('Canceling subscription to trigger free status...');
    const canceledSubscription = await stripe.subscriptions.cancel(subscription.id, {
      prorate: false
    });
    
    console.log('✅ Subscription canceled:', canceledSubscription.id);
    console.log('✅ User is now FREE (subscription canceled)');
    
    console.log('\n🎯 Test Instructions:');
    console.log('1. This simulates a user whose subscription was CANCELED');
    console.log('2. Customer email:', customer.email);
    console.log('3. Customer ID:', customer.id);
    console.log('4. User ID in metadata:', customer.metadata.userId);
    console.log('5. Subscription Status:', 'free (subscription canceled)');
    console.log('6. Canceled Subscription ID:', canceledSubscription.id);
    console.log('\n📝 Free users (after cancellation) are identified by:');
    console.log('   - Having a Stripe customer ID');
    console.log('   - Having a CANCELED subscription');
    console.log('   - subscriptionStatus metadata set to "free"');
    console.log('\n🧪 Your webhook should handle:');
    console.log('   - customer.subscription.deleted events');
    console.log('   - invoice.payment_failed events (leading to cancellation)');
    console.log('   - Update Supabase to set subscription_status = "free"');
    console.log('\n✅ This represents a user who had a subscription but canceled it');
    console.log('\n🔔 Webhook events that should be triggered:');
    console.log('   - customer.subscription.updated (when canceled)');
    console.log('   - customer.subscription.deleted (if completely removed)');
    
  } catch (error) {
    console.error('Error creating test data:', error.message);
  }
}

testWebhookWithFreeSubscription();