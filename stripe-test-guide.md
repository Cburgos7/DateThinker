# Stripe Testing Guide

This guide will help you test your Stripe payment integration.

## Prerequisites
1. Stripe account with test mode enabled
2. Stripe CLI installed
3. Test API keys configured in `.env`

## Testing Process

### 1. Set Up Test Environment
- Ensure you're using test keys in your `.env` file (should start with `sk_test_` and `pk_test_`)
- Create test products and prices in your Stripe dashboard if you haven't already
- Update the price IDs in your `.env` file

### 2. Start Local Server
```bash
npm run dev
```

### 3. Set Up Stripe CLI for Webhook Testing
After installing the Stripe CLI:

```bash
# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

This will provide you with a webhook signing secret. Update your `.env` file:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx
```

### 4. Test Payment Flow
1. Navigate to your pricing page
2. Create a test account or login
3. Select a plan and click subscribe
4. Use test card details:
   - Card number: 4242 4242 4242 4242
   - Expiry: Any future date (e.g., 12/34)
   - CVC: Any 3 digits (e.g., 123)
   - Name, address: Any values

### 5. Test Webhook Events
The Stripe CLI will automatically forward events to your application. Check your console logs to see if webhook events are being processed correctly.

## Test Cards
- **Successful payment**: 4242 4242 4242 4242
- **Requires authentication**: 4000 0025 0000 3155
- **Declined payment**: 4000 0000 0000 9995

## Common Issues

### Webhooks Not Working
- Check if the webhook secret in `.env` matches the one provided by the Stripe CLI
- Ensure your webhook route is correctly implemented
- Check server logs for errors

### Payment Not Completing
- Ensure you're using test cards
- Check Stripe dashboard for errors in the Events log
- Verify the checkout session configuration

### Subscription Status Not Updating
- Check if the webhook events are being properly processed
- Verify database update functions
- Check user ID mapping between Stripe customer and your database 