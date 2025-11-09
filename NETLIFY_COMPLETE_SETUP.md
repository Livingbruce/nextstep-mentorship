# 🚀 Complete Netlify Setup Guide for NextStep Mentorship

This guide will help you set up both frontend and backend on Netlify successfully.

## 📋 Prerequisites

- ✅ Project pushed to GitHub: https://github.com/Livingbruce/nextstep-mentorship
- ✅ Netlify account connected to GitHub repository
- ✅ PostgreSQL database (from Render or other provider)

## 🔧 Step 1: Configure Netlify Site Settings

### 1.1 Go to Netlify Dashboard
Visit: https://app.netlify.com/projects/nextstep-mentorship/configuration/general

### 1.2 Build Settings
The build settings are already configured in `netlify.toml`, but verify:
- **Base directory**: `.` (root)
- **Build command**: `cd backend && npm install && cd netlify/functions && npm install && cd ../../frontend && npm install && npm run build`
- **Publish directory**: `frontend/dist`

## 🔐 Step 2: Set Environment Variables

Go to: https://app.netlify.com/projects/nextstep-mentorship/configuration/env

### 2.1 Required Backend Variables

Add these environment variables:

```bash
# Database Connection
DATABASE_URL=postgresql://nextstep_mentorship_db_user:b8WVAYPPTfEBJffTjzvOq24uTFGu21fd@dpg-d473u6ili9vc738fevl0-a.singapore-postgres.render.com/nextstep_mentorship_db

# Application Settings
API_URL=https://nextstep-mentorship.netlify.app
NODE_ENV=production
JWT_SECRET=your-super-secret-jwt-key-here
FRONTEND_URL=https://nextstep-mentorship.netlify.app
```

### 2.2 Optional Backend Variables

If you're using these features, add them:

```bash
# Telegram Bot (if using)
BOT_TOKEN=your-telegram-bot-token

# Email Service (if using)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### 2.3 Frontend Variable

```bash
# Leave empty to use relative URLs (recommended - no CORS issues)
VITE_API_BASE_URL=
```

**OR** set to your Netlify URL:
```bash
VITE_API_BASE_URL=https://nextstep-mentorship.netlify.app
```

## 🏗️ Step 3: Deploy

### 3.1 Automatic Deployment
1. Netlify will automatically deploy when you push to GitHub
2. Or manually trigger a deploy from the Netlify dashboard

### 3.2 Build Process
The build will:
1. Install backend dependencies
2. Install function dependencies
3. Install frontend dependencies
4. Build frontend
5. Set up Netlify functions

**Expected build time**: 3-5 minutes

## ✅ Step 4: Verify Deployment

### 4.1 Check Build Logs
Go to: https://app.netlify.com/projects/nextstep-mentorship/deploys

Look for:
- ✅ "Build successful"
- ✅ No errors in build logs
- ✅ Functions deployed successfully

### 4.2 Test Health Endpoint
Visit: `https://nextstep-mentorship.netlify.app/api/health`

Should return:
```json
{"status":"ok"}
```

### 4.3 Test Frontend
Visit: `https://nextstep-mentorship.netlify.app`

Should load the application without errors.

### 4.4 Test Login
1. Go to the login page
2. Try logging in
3. **Should work without CORS errors!** ✅

## 🔍 Step 5: Troubleshooting

### Issue: Build Fails

**Error**: "Cannot find module" or "Module not found"
- **Solution**: Check that all dependencies are in `package.json` files
- Verify `backend/netlify/functions/package.json` exists
- Check build logs for specific missing modules

**Error**: "Function not found"
- **Solution**: Verify `backend/netlify/functions/api.js` exists
- Check `netlify.toml` has correct function directory

### Issue: Function Errors

**Error**: "Database connection failed"
- **Solution**: 
  - Verify `DATABASE_URL` is set correctly
  - Check database allows connections from Netlify IPs
  - Ensure database is running

**Error**: "JWT_SECRET not found"
- **Solution**: Set `JWT_SECRET` in Netlify environment variables

### Issue: CORS Errors

**Should NOT happen** with Netlify backend (same domain)
- If you see CORS errors:
  - Check `FRONTEND_URL` is set to your Netlify URL
  - Verify `VITE_API_BASE_URL` is empty or set to Netlify URL
  - Check browser console for specific error

### Issue: Frontend Not Loading

**Error**: "404 Not Found"
- **Solution**: 
  - Verify `publish` directory is `frontend/dist`
  - Check that frontend build completed successfully
  - Verify `netlify.toml` has correct redirect rules

## 📊 Step 6: Monitor Deployment

### 6.1 Check Function Logs
Go to: https://app.netlify.com/projects/nextstep-mentorship/functions

View:
- Function invocations
- Error logs
- Execution time
- Success/failure rates

### 6.2 Check Site Analytics
Go to: https://app.netlify.com/projects/nextstep-mentorship/analytics

Monitor:
- Page views
- Unique visitors
- Top pages
- Performance metrics

## 🎯 How It Works

### Architecture
```
┌─────────────────────────────────────┐
│   Netlify Site                      │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │   Frontend   │  │   Backend   │ │
│  │  (Static)    │  │  (Function) │ │
│  │              │  │             │ │
│  │  React App   │  │  Express    │ │
│  │  /index.html │  │  /api/*     │ │
│  └──────────────┘  └─────────────┘ │
│                                     │
│  Same Domain = No CORS! ✅          │
└─────────────────────────────────────┘
```

### Request Flow
1. User visits: `https://nextstep-mentorship.netlify.app`
2. Netlify serves frontend from `frontend/dist/`
3. Frontend makes API call: `/api/auth/login`
4. Netlify redirects to: `/.netlify/functions/api`
5. Function handles request (Express app)
6. Response sent back to frontend
7. **Same domain = No CORS issues!** ✅

## 📝 Important Notes

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

## 🔗 Quick Links

- **Netlify Dashboard**: https://app.netlify.com/projects/nextstep-mentorship
- **Environment Variables**: https://app.netlify.com/projects/nextstep-mentorship/configuration/env
- **Function Logs**: https://app.netlify.com/projects/nextstep-mentorship/functions
- **Build Logs**: https://app.netlify.com/projects/nextstep-mentorship/deploys
- **Site URL**: https://nextstep-mentorship.netlify.app
- **API Health**: https://nextstep-mentorship.netlify.app/api/health

## ✅ Checklist

Before deployment:
- [ ] Environment variables set in Netlify
- [ ] `netlify.toml` is in root directory
- [ ] `backend/netlify/functions/api.js` exists
- [ ] `backend/netlify/functions/package.json` exists
- [ ] Database is accessible

After deployment:
- [ ] Build completed successfully
- [ ] Health endpoint returns OK
- [ ] Frontend loads correctly
- [ ] Login works without CORS errors
- [ ] Function logs show no errors

## 🎉 Success!

Once everything is set up:
- ✅ Frontend and backend on same domain
- ✅ No CORS issues
- ✅ Simple deployment process
- ✅ Easy to monitor and debug

---

**Need help?** Check the build logs in Netlify dashboard for specific error messages.

