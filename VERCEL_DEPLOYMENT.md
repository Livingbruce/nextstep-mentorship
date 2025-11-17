# Vercel Deployment Guide - nextestep-mentorship

## 🚀 Quick Deployment Steps

Your code is already pushed to GitHub: https://github.com/Livingbruce/nextstep-mentorship

### 1. Check Auto-Deployment Status

Vercel should automatically detect the push and start deploying. Check your Vercel dashboard:
- **Project URL:** https://vercel.com/victor-mburugu-s-projects/nextestep-mentorship
- **Live URL:** https://nextestep-mentorship.vercel.app

If deployment hasn't started automatically:
1. Go to your Vercel project dashboard
2. Click **Deployments** tab
3. Click **Redeploy** on the latest deployment

### 2. Add Payment Environment Variables

**Critical:** Add these environment variables in Vercel before testing payments.

#### Go to: Settings → Environment Variables

Add these variables for **Production** environment:

```bash
# M-Pesa Credentials (Get from Safaricom Developer Portal)
MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here
MPESA_PASSKEY=your_passkey_here
MPESA_SHORTCODE=522522
MPESA_BASE_URL=https://api.safaricom.co.ke
MPESA_CALLBACK_URL=https://nextestep-mentorship.vercel.app/api/payments/mpesa/callback

# Update existing URLs (verify these are correct)
API_URL=https://nextestep-mentorship.vercel.app
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Optional overrides for manual bank instructions
BANK_ACCOUNT_NAME=Desol Nurturers
BANK_ACCOUNT_NUMBER=1343210186
```

**Important Notes:**
- Replace `your-frontend-domain.vercel.app` with your actual frontend Vercel domain
- For testing, use sandbox: `MPESA_BASE_URL=https://sandbox.safaricom.co.ke`
- After adding variables, **Redeploy** the project

### 3. Verify Deployment

After deployment completes, test these endpoints:

```bash
# Health check
curl https://nextestep-mentorship.vercel.app/api/health

# Payment account details
curl https://nextestep-mentorship.vercel.app/api/payments/account-details
```

Expected response for account details:
```json
{
  "accountName": "Desol Nurturers",
  "accountNumber": "1343210186",
  "paybillNumber": "522522"
}
```

### 4. Configure Webhooks

#### M-Pesa Webhook:
1. Go to [Safaricom Developer Portal](https://developer.safaricom.co.ke/)
2. Navigate to your app settings
3. Set **STK Push Callback URL:**
   ```
   https://nextestep-mentorship.vercel.app/api/payments/mpesa/callback
   ```


### 5. Test Deployment

#### Test M-Pesa Payment:
1. Visit your booking form
2. Select "M-Pesa" payment
3. Enter phone number
4. Verify STK push is received
5. Complete payment
6. Check if appointment auto-confirms

#### Test Bank Transfer Flow:
1. Visit your booking form
2. Select "Bank Transfer"
3. Confirm that account details display correctly
4. Enter a test reference (e.g., `BANKTEST123`)
5. Submit the booking and verify the reference appears in the admin dashboard
6. Manually mark the payment as confirmed to complete the flow

## 📋 Deployment Checklist

- [ ] Code pushed to GitHub (✅ Done)
- [ ] Vercel auto-deployment triggered
- [ ] Environment variables added
- [ ] Backend redeployed with new variables
- [ ] Health endpoint working
- [ ] Payment endpoints accessible
- [ ] M-Pesa webhook configured
- [ ] Test payments successful

## 🔍 Troubleshooting

### If deployment fails:
1. Check **Vercel Logs** in the Functions tab
2. Verify all environment variables are set
3. Check for build errors in deployment logs

### If payments don't work:
1. Verify environment variables are correct
2. Check webhook URLs are accessible
3. Review Vercel function logs for errors
4. Test with sandbox credentials first

## 📞 Quick Links

- **GitHub Repo:** https://github.com/Livingbruce/nextstep-mentorship
- **Vercel Project:** https://vercel.com/victor-mburugu-s-projects/nextestep-mentorship
- **Live Backend:** https://nextestep-mentorship.vercel.app

## 🎯 Next Steps

1. **Add environment variables** in Vercel (most important!)
2. **Redeploy** after adding variables
3. **Configure webhooks** in payment provider dashboards
4. **Test** with sandbox credentials first
5. **Switch to production** credentials when ready

---

**Status:** Code is deployed to GitHub. Vercel should auto-deploy. Add environment variables to complete setup!

