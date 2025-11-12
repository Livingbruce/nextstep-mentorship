# M-Pesa Payment Setup Guide

## Overview
This guide explains how to configure M-Pesa STK Push payments for the NextStep Mentorship platform.

## Prerequisites
- M-Pesa Daraja API account (Safaricom Developer Portal)
- Production or Sandbox credentials
- Paybill number: **522522** (Desol Nurturers Limited)

## Environment Variables Required

Add these environment variables to your Vercel project:

### Required Variables:
1. **MPESA_CONSUMER_KEY**
   - Your M-Pesa Daraja API Consumer Key
   - Get from: https://developer.safaricom.co.ke/

2. **MPESA_CONSUMER_SECRET**
   - Your M-Pesa Daraja API Consumer Secret
   - Get from: https://developer.safaricom.co.ke/

3. **MPESA_PASSKEY**
   - Your M-Pesa Daraja API Passkey
   - Get from: https://developer.safaricom.co.ke/

4. **MPESA_SHORTCODE**
   - Your Paybill number: **522522**
   - This is the business number customers will use

5. **MPESA_BASE_URL** (Optional)
   - Sandbox: `https://sandbox.safaricom.co.ke`
   - Production: `https://api.safaricom.co.ke`
   - Defaults to sandbox if not set

6. **MPESA_CALLBACK_URL** (Optional)
   - Your webhook URL for payment confirmations
   - Format: `https://your-domain.vercel.app/api/payments/mpesa/callback`
   - Defaults to auto-generated URL if not set

## Setting Up in Vercel

1. Go to your Vercel project: https://vercel.com/victor-mburugu-s-projects/nextestep-mentorship

2. Navigate to **Settings** → **Environment Variables**

3. Add each variable:
   - Click **Add New**
   - Enter the variable name (e.g., `MPESA_CONSUMER_KEY`)
   - Enter the value
   - Select environments: **Production**, **Preview**, **Development**
   - Click **Save**

4. After adding all variables, **redeploy** your application:
   ```bash
   vercel --prod
   ```

## Testing

### Sandbox Testing
1. Use sandbox credentials from Safaricom Developer Portal
2. Set `MPESA_BASE_URL=https://sandbox.safaricom.co.ke`
3. Test with test phone numbers provided by Safaricom

### Production
1. Complete Safaricom's production onboarding process
2. Get production credentials
3. Set `MPESA_BASE_URL=https://api.safaricom.co.ke`
4. Update all environment variables with production values

## Current Status

**⚠️ M-Pesa is currently not configured**

The system will:
- ✅ Create bookings successfully
- ⚠️ Log a warning that M-Pesa credentials are missing
- ✅ Allow users to pay manually via Paybill **522522**

Once credentials are added:
- ✅ STK Push prompts will be sent automatically
- ✅ Payments will be confirmed automatically via webhook
- ✅ Appointments will be marked as paid automatically

## Manual Payment Instructions (Current Workaround)

Until M-Pesa is configured, users can pay manually:

1. **M-Pesa Paybill:**
   - Business Number: **522522**
   - Account Number: [Appointment Code] (e.g., JYRZUC)
   - Amount: [Session Cost]

2. After payment, contact support with:
   - Appointment Code
   - M-Pesa Transaction Reference
   - Payment will be verified and appointment confirmed

## Support

For issues or questions:
- Check Vercel logs for payment errors
- Verify all environment variables are set correctly
- Ensure callback URL is accessible from Safaricom's servers

