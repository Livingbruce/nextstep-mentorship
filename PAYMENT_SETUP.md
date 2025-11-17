# Payment System Setup Guide

## Overview

The payment system has been integrated with real account details and supports:
1. **M-Pesa Paybill** (522522) – Automatic STK push with auto-confirmation
2. **Bank Transfer** – Manual payment with Desol Nurturers bank account

## Account Details

- **Account Name:** Desol Nurturers
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

# Base URLs
API_URL=https://your-backend-domain.com
FRONTEND_URL=https://your-frontend-domain.com

# Optional overrides for bank instructions
BANK_ACCOUNT_NAME=Desol Nurturers
BANK_ACCOUNT_NUMBER=1343210186
```

## Payment Flow

### M-Pesa Payment Flow

1. **User selects M-Pesa** in booking form
2. **System initiates STK push** to user's phone number
3. **User enters PIN** on their phone
4. **M-Pesa processes payment** and sends callback to `/api/payments/mpesa/callback`
5. **System automatically marks appointment as paid** and confirms booking
6. **User receives confirmation** via Telegram/Email

### Bank Transfer Flow

1. **User selects Bank Transfer** in the booking form or Telegram bot
2. **System shows manual payment guide** (account name, number, reference instructions)
3. **User sends funds via mobile/online banking** and shares the transaction reference
4. **Operations team verifies payment manually** and confirms the appointment/order

## API Endpoints

### Payment Callbacks (Webhooks)
- `POST /api/payments/mpesa/callback` - M-Pesa payment confirmation

### Payment Utilities
- `GET /api/payments/account-details` - Get account details for display
- `GET /api/payments/verify/:reference` - Verify payment status by reference

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

### Bank Transfer Testing
1. Submit a booking using **Bank Transfer**
2. Enter a dummy transaction reference (e.g., `TEST123`)
3. Confirm that the reference is saved in the intake form and dashboard
4. Mark the appointment/order as paid manually in the admin UI or via SQL

## Security Notes

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive data
3. **Enable HTTPS** for all payment callbacks
4. **Validate webhook signatures** (implement based on your gateway)
5. **Do not collect card numbers** in the app—only share bank or M-Pesa instructions

## Next Steps

1. **Get M-Pesa Daraja API credentials** from Safaricom Developer Portal
2. **Confirm bank account ownership** with Desol Nurturers finance team
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

### Bank Transfer Not Verified
- Confirm funds reached the Desol Nurturers account
- Ask the client for the reference or screenshot
- Update the appointment/order status manually once confirmed

### Payment Not Auto-Confirming
- Verify webhook endpoints are accessible
- Check database connection
- Review payment callback logs
- Ensure appointment codes match

