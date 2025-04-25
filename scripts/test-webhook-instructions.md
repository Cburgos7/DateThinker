# Testing Stripe Webhooks

Follow these steps to test the complete payment flow with webhooks:

## 1. Install the Stripe CLI

If you haven't already:
- For Windows: [Download the Stripe CLI](https://github.com/stripe/stripe-cli/releases/latest)
- Extract the zip file and add the directory to your PATH

## 2. Login to your Stripe account

```bash
stripe login
```

This will open a browser window to authorize the CLI.

## 3. Forward webhooks to your local server

In a separate terminal window, run:

```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

This will provide you with a webhook signing secret that looks like:
```
whsec_1234567890abcdefghijklmnopqrstuvwxyz
```

## 4. Update your .env file

Copy the webhook signing secret from the previous step and update your `.env` file:

```
STRIPE_WEBHOOK_SECRET=whsec_your_signing_secret
```

## 5. Start your development server

```bash
npm run dev
```

## 6. Test the payment flow

1. Navigate to your pricing page (http://localhost:3000/pricing)
2. Log in or create a test account
3. Click on the subscription option
4. Complete the checkout using test card information:
   - Card number: 4242 4242 4242 4242
   - Expiry: Any future date (e.g., 12/34)
   - CVC: Any 3 digits (e.g., 123)

## 7. Monitor webhook events

In the terminal where you ran `stripe listen`, you should see events being forwarded to your application:

```
2025-04-25 12:34:56 -> checkout.session.completed [evt_1234567890]
```

Your application's webhook handler should process these events and update the user's subscription status.

## 8. Verify subscription status

Check your user's subscription status in your application to ensure it was updated correctly.

## Troubleshooting

### Webhook not receiving events
- Ensure your webhook secret in `.env` matches the one from the Stripe CLI
- Check that your webhook endpoint is correctly implemented
- Look for any error messages in your terminal

### Payment not completing
- Make sure you're using the test card number (4242 4242 4242 4242)
- Check for errors in the Stripe dashboard
- Verify the checkout session configuration 