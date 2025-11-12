# Payment System Setup Guide

## Overview

The payment system has been integrated with real account details and supports:
1. **M-Pesa Paybill** (522522) - Automatic STK push with auto-confirmation
2. **Bank Transfer** - Manual payment with account details
3. **Card Payment** - Visa and local Kenya cards via payment gateway

## Account Details

- **Account Name:** Desol Nurturers Limited
- **Account Number:** 1343210186
- **Paybill Number:** 522522

## Environment Variables Required

Add these to your `.env` file:

```bash
# M-Pesa Daraja API Credentials
MPESA_CONSUMER_KEY=your_consumer_key
MPESA_CONSUMER_SECRET=your_consumer_secret
MPESA_PASSKEY=your_passkey
MPESA_SHORTCODE=522522
MPESA_BASE_URL=https://api.safaricom.co.ke  # Production URL (use https://sandbox.safaricom.co.ke for testing)
MPESA_CALLBACK_URL=https://your-domain.com/api/payments/mpesa/callback

# Payment Gateway (for card payments - Pesapal, Flutterwave, or Stripe)
PAYMENT_GATEWAY_API_KEY=your_gateway_api_key
PAYMENT_GATEWAY_API_SECRET=your_gateway_api_secret
PAYMENT_GATEWAY_BASE_URL=https://api.pesapal.com  # Adjust based on your gateway

# Base URLs
API_URL=https://your-backend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

## Payment Flow

### M-Pesa Payment Flow

1. **User selects M-Pesa** in booking form
2. **System initiates STK push** to user's phone number
3. **User enters PIN** on their phone
4. **M-Pesa processes payment** and sends callback to `/api/payments/mpesa/callback`
5. **System automatically marks appointment as paid** and confirms booking
6. **User receives confirmation** via Telegram/Email

### Bank/Card Payment Flow

1. **User selects Bank or Card** in booking form
2. **For Bank:** System displays account details (Paybill 522522, Account Number 1343210186)
3. **For Card:** User enters card details (cardholder name, card number, expiry, CVV)
4. **System processes card payment** via payment gateway
5. **User redirected to payment gateway** for 3D Secure authentication (if required)
6. **Payment gateway sends callback** to `/api/payments/card/callback`
7. **System automatically marks appointment as paid** and confirms booking

## API Endpoints

### Payment Callbacks (Webhooks)
- `POST /api/payments/mpesa/callback` - M-Pesa payment confirmation
- `POST /api/payments/card/callback` - Card payment confirmation

### Payment Utilities
- `GET /api/payments/account-details` - Get account details for display
- `GET /api/payments/verify/:reference` - Verify payment status by reference
- `POST /api/payments/card/initiate` - Initiate card payment

## Database Schema

The system uses existing tables:
- `appointments` - Stores payment status and amount
- `book_orders` - Stores payment status for book purchases
- `payment_transactions` - Optional table for payment history (create if needed)

## Testing

### M-Pesa Testing (Sandbox)
1. Use sandbox credentials from Safaricom Developer Portal
2. Set `MPESA_BASE_URL=https://sandbox.safaricom.co.ke`
3. Use test phone numbers provided by Safaricom

### Card Payment Testing
1. Use test card numbers from your payment gateway
2. Use sandbox API credentials
3. Test both successful and failed payment scenarios

## Security Notes

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Enable HTTPS** for all payment callbacks
4. **Validate webhook signatures** (implement based on your gateway)
5. **Encrypt card details** before storing (currently only last 4 digits stored)

## Next Steps

1. **Get M-Pesa Daraja API credentials** from Safaricom Developer Portal
2. **Choose payment gateway** (Pesapal, Flutterwave, or Stripe) and get credentials
3. **Update environment variables** with production credentials
4. **Test payment flows** in sandbox environment
5. **Deploy to production** and update callback URLs
6. **Monitor payment transactions** for any issues

## Troubleshooting

### M-Pesa STK Push Not Working
- Check if credentials are correct
- Verify callback URL is accessible from internet
- Check M-Pesa API status
- Review error logs for specific error messages

### Card Payment Not Processing
- Verify payment gateway credentials
- Check if gateway supports Kenya cards
- Review callback URL configuration
- Check payment gateway logs

### Payment Not Auto-Confirming
- Verify webhook endpoints are accessible
- Check database connection
- Review payment callback logs
- Ensure appointment codes match

