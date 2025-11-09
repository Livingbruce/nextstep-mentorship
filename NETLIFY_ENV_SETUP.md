# Netlify Environment Variables Setup

## 🔧 Required Steps for Deployment

### Step 1: Set Backend Environment Variables

Go to: https://app.netlify.com/projects/nextstep-mentorship/configuration/env

**Add these variables:**

```
API_URL=https://nextstep-mentorship.netlify.app
DATABASE_URL=postgresql://nextstep_mentorship_db_user:b8WVAYPPTfEBJffTjzvOq24uTFGu21fd@dpg-d473u6ili9vc738fevl0-a.singapore-postgres.render.com/nextstep_mentorship_db
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here
FRONTEND_URL=https://nextstep-mentorship.netlify.app
```

**Optional (if using):**
```
BOT_TOKEN=your-telegram-bot-token
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Step 2: Set Frontend Environment Variable (Optional)

**For Frontend:**
```
VITE_API_BASE_URL=
```
**Leave empty** to use relative URLs (recommended - no CORS issues since backend is on same domain).

### Step 3: Deploy

1. Netlify will auto-deploy after git push (already done)
2. Wait 3-5 minutes for build to complete
3. Check deployment status in Netlify dashboard

### Step 4: Test

1. **Health Check**: `https://nextstep-mentorship.netlify.app/api/health`
   - Should return: `{"status":"ok"}`

2. **Frontend**: `https://nextstep-mentorship.netlify.app`
   - Should load the application
   - Try logging in - should work without CORS errors!

## ✅ Verification Checklist

- [ ] Environment variables set in Netlify
- [ ] Deployment completed successfully
- [ ] Health endpoint returns OK
- [ ] Frontend loads correctly
- [ ] Login works without CORS errors
- [ ] Check function logs for any errors

## 🔍 Troubleshooting

### Function Not Found
- Check `netlify.toml` has correct function directory
- Verify `backend/netlify/functions/api.js` exists
- Check build logs

### Database Connection Fails
- Verify `DATABASE_URL` is correct
- Check database allows connections from Netlify
- Look at function logs

### CORS Errors
- Should NOT happen with Netlify backend (same domain)
- If still occurring, check `VITE_API_BASE_URL` is empty or set to Netlify URL

