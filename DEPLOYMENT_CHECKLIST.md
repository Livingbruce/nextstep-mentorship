# Deployment Checklist - Payment System

## Pre-Deployment Steps

### 1. Code Review ✅
- [x] Payment service created (`backend/src/services/paymentService.js`)
- [x] Payment routes created (`backend/src/routes/payments.js`)
- [x] Bot updated with real account details
- [x] Booking service integrated with payment initiation
- [x] Frontend updated with card payment form
- [x] All files committed to git

### 2. Environment Variables Setup

#### Required for Production:
```bash
# M-Pesa (Get from Safaricom Developer Portal)
MPESA_CONSUMER_KEY=your_production_consumer_key
MPESA_CONSUMER_SECRET=your_production_consumer_secret
MPESA_PASSKEY=your_production_passkey
MPESA_SHORTCODE=522522
MPESA_BASE_URL=https://api.safaricom.co.ke
MPESA_CALLBACK_URL=https://your-backend-domain.vercel.app/api/payments/mpesa/callback

# Payment Gateway (Choose one: Pesapal, Flutterwave, or Stripe)
PAYMENT_GATEWAY_API_KEY=your_gateway_api_key
PAYMENT_GATEWAY_API_SECRET=your_gateway_api_secret
PAYMENT_GATEWAY_BASE_URL=https://api.pesapal.com  # or your gateway URL

# Base URLs
API_URL=https://your-backend-domain.vercel.app
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### 3. Database Migration (if needed)
- [ ] Verify `appointments` table has `amount_cents` column
- [ ] Verify `book_orders` table has payment-related columns
- [ ] Create `payment_transactions` table (optional, for payment history)

### 4. Testing Checklist

#### M-Pesa Testing:
- [ ] Test STK push initiation in sandbox
- [ ] Verify callback URL is accessible
- [ ] Test payment success flow
- [ ] Test payment failure flow
- [ ] Verify auto-confirmation works

#### Card Payment Testing:
- [ ] Test card payment form submission
- [ ] Verify payment gateway integration
- [ ] Test 3D Secure flow (if applicable)
- [ ] Test payment callback handling
- [ ] Verify auto-confirmation works

## Deployment Steps

### Step 1: Commit and Push Changes
```bash
git add .
git commit -m "Add payment system integration with M-Pesa and card payments"
git push origin main
```

### Step 2: Deploy Backend to Vercel

1. Go to Vercel Dashboard → Your Backend Project
2. Navigate to **Settings** → **Environment Variables**
3. Add all payment-related environment variables listed above
4. Go to **Deployments** tab
5. Click **Redeploy** or wait for automatic deployment

### Step 3: Deploy Frontend to Vercel

1. Go to Vercel Dashboard → Your Frontend Project
2. Go to **Deployments** tab
3. Click **Redeploy** or wait for automatic deployment

### Step 4: Verify Deployment

#### Backend Health Check:
```bash
curl https://your-backend-domain.vercel.app/api/health
# Should return: {"status":"ok"}
```

#### Payment Endpoints Check:
```bash
# Account details endpoint
curl https://your-backend-domain.vercel.app/api/payments/account-details
# Should return account details

# Verify endpoint
curl https://your-backend-domain.vercel.app/api/payments/verify/TEST-REF
```

### Step 5: Configure M-Pesa Webhook

1. Log in to Safaricom Developer Portal
2. Navigate to your app settings
3. Set **Callback URL** to: `https://your-backend-domain.vercel.app/api/payments/mpesa/callback`
4. Save changes

### Step 6: Configure Payment Gateway Webhook

1. Log in to your payment gateway dashboard (Pesapal/Flutterwave/Stripe)
2. Navigate to webhook settings
3. Add webhook URL: `https://your-backend-domain.vercel.app/api/payments/card/callback`
4. Enable events: Payment completed, Payment failed
5. Save changes

## Post-Deployment Verification

### 1. Test M-Pesa Payment Flow
- [ ] Create a test booking with M-Pesa payment
- [ ] Verify STK push is received on test phone
- [ ] Complete payment with test PIN
- [ ] Verify appointment is auto-confirmed
- [ ] Check Telegram/Email notification received

### 2. Test Card Payment Flow
- [ ] Create a test booking with card payment
- [ ] Enter test card details
- [ ] Complete payment flow
- [ ] Verify appointment is auto-confirmed
- [ ] Check Telegram/Email notification received

### 3. Test Bank Transfer Display
- [ ] Create a booking with bank transfer option
- [ ] Verify account details are displayed correctly:
  - Account Name: Desol Nurturers Limited
  - Account Number: 1343210186
  - Paybill: 522522

### 4. Monitor Logs
- [ ] Check Vercel function logs for errors
- [ ] Monitor payment callback logs
- [ ] Check database for payment status updates

## Rollback Plan (if needed)

If deployment fails:

1. **Revert Git Commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Redeploy Previous Version:**
   - Go to Vercel Dashboard
   - Find previous successful deployment
   - Click "Promote to Production"

3. **Remove Environment Variables:**
   - Remove payment-related env vars temporarily
   - System will fall back to manual payment confirmation

## Support & Troubleshooting

### Common Issues:

1. **M-Pesa STK Push Not Working**
   - Check if credentials are correct
   - Verify callback URL is accessible
   - Check M-Pesa API status
   - Review Vercel function logs

2. **Card Payment Not Processing**
   - Verify payment gateway credentials
   - Check if gateway supports Kenya cards
   - Review callback URL configuration
   - Check payment gateway logs

3. **Payment Not Auto-Confirming**
   - Verify webhook endpoints are accessible
   - Check database connection
   - Review payment callback logs
   - Ensure appointment codes match

### Contact:
- Check `PAYMENT_SETUP.md` for detailed setup instructions
- Review Vercel deployment logs
- Check payment gateway documentation

## Production Checklist

- [ ] All environment variables set in Vercel
- [ ] M-Pesa webhook configured
- [ ] Payment gateway webhook configured
- [ ] Test payments successful
- [ ] Auto-confirmation working
- [ ] Notifications sending correctly
- [ ] Database updates working
- [ ] Error handling tested
- [ ] Logs monitoring set up

## Next Steps After Deployment

1. **Monitor First Real Payments:**
   - Watch for any errors
   - Verify confirmations are sent
   - Check database updates

2. **Set Up Alerts:**
   - Payment failure alerts
   - Webhook failure alerts
   - Database error alerts

3. **Documentation:**
   - Update user documentation
   - Create payment FAQ
   - Document troubleshooting steps

