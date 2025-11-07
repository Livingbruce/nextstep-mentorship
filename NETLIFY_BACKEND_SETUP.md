# 🚀 Deploy Backend to Netlify - Complete Setup Guide

## ✅ Why This Solves CORS

**Current Problem**: Frontend on Netlify, Backend on Render = CORS issues
**Solution**: Deploy backend to Netlify = **Same domain = NO CORS!**

When both frontend and backend are on `*.netlify.app`, browsers treat them as same-origin.

## 📋 Setup Steps

### Step 1: Install Dependencies

The code is already set up! Just install the serverless package:

```bash
cd backend
npm install serverless-http
```

Or it will install automatically when Netlify builds.

### Step 2: Update Frontend API URL

Go to Netlify Dashboard: https://app.netlify.com/projects/nextstep-mentorship/configuration/env

**Update or Add:**
```
VITE_API_BASE_URL=https://nextstep-mentorship.netlify.app
```

**OR** leave it empty to use relative URLs (even better!):
```
VITE_API_BASE_URL=
```

Then update frontend code to use relative URLs when empty.

### Step 3: Set Backend Environment Variables

Go to Netlify Dashboard → Site settings → Environment variables:

**Required Variables:**
```
DATABASE_URL=postgresql://nextstep_mentorship_db_user:b8WVAYPPTfEBJffTjzvOq24uTFGu21fd@dpg-d473u6ili9vc738fevl0-a.singapore-postgres.render.com/nextstep_mentorship_db
NODE_ENV=production
JWT_SECRET=your-secret-key
FRONTEND_URL=https://nextstep-mentorship.netlify.app
```

**Optional:**
```
BOT_TOKEN=your-telegram-bot-token
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Step 4: Deploy

1. **Push to GitHub** (already done)
2. **Netlify will auto-deploy**
3. **Wait 3-5 minutes** for build to complete
4. **Test**: Visit `https://nextstep-mentorship.netlify.app/api/health`

## 🎯 How It Works

1. **Frontend**: Serves from `https://nextstep-mentorship.netlify.app/`
2. **Backend API**: Available at `https://nextstep-mentorship.netlify.app/api/*`
3. **Netlify Functions**: Handles `/api/*` routes via `backend/netlify/functions/api.js`
4. **Same Domain**: No CORS needed!

## 🔧 Configuration Files

### netlify.toml (Already Updated)
```toml
[functions]
  directory = "backend/netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api"
  status = 200
  force = true
```

### backend/netlify/functions/api.js (Created)
Wraps your Express app as a Netlify Function.

## ✅ Benefits

1. **✅ No CORS Issues** - Same domain
2. **✅ Simpler Setup** - One deployment
3. **✅ Better Performance** - Same CDN
4. **✅ Easier Debugging** - All logs in Netlify
5. **✅ Cost Effective** - One platform

## ⚠️ Important Notes

### Function Timeouts
- **Free tier**: 10 seconds
- **Pro tier**: 26 seconds
- For long-running operations, consider background jobs

### Cold Starts
- First request after inactivity may be slower (1-2 seconds)
- Subsequent requests are fast
- Consider keeping functions warm with a cron job

### Database Connections
- Make sure your database allows connections from Netlify IPs
- Render database should work fine
- Consider connection pooling for better performance

## 🧪 Testing

### 1. Test Health Endpoint
```
https://nextstep-mentorship.netlify.app/api/health
```
Should return: `{"status":"ok"}` or similar

### 2. Test Login
1. Visit: https://nextstep-mentorship.netlify.app
2. Try logging in
3. **Should work without CORS errors!**

### 3. Check Function Logs
Go to Netlify Dashboard → Functions → View logs

## 🔍 Troubleshooting

### Function Not Found
- Check `netlify.toml` has correct function directory
- Verify `backend/netlify/functions/api.js` exists
- Check build logs for errors

### Database Connection Fails
- Verify `DATABASE_URL` is set correctly
- Check database allows connections from Netlify
- Look at function logs for connection errors

### Timeout Errors
- Check function execution time
- Optimize slow queries
- Consider upgrading to Pro plan for longer timeouts

## 📊 Monitoring

### Netlify Dashboard
- **Functions**: View invocations, errors, duration
- **Logs**: Real-time function logs
- **Analytics**: Request patterns

## 🎉 After Deployment

1. ✅ Update `VITE_API_BASE_URL` to Netlify URL (or use relative)
2. ✅ Test all API endpoints
3. ✅ Verify login works
4. ✅ Check function logs for any errors
5. ✅ Monitor performance

## 🔗 Quick Links

- **Netlify Dashboard**: https://app.netlify.com/projects/nextstep-mentorship
- **Environment Variables**: https://app.netlify.com/projects/nextstep-mentorship/configuration/env
- **Function Logs**: https://app.netlify.com/projects/nextstep-mentorship/functions
- **Frontend URL**: https://nextstep-mentorship.netlify.app
- **API Health**: https://nextstep-mentorship.netlify.app/api/health

---

**Once deployed, CORS issues will be completely eliminated!** 🎉

