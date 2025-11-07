# Fix Login CSP Error

## 🔴 Problem
Login fails with error: `Failed to fetch. Refused to connect because it violates the document's Content Security Policy.`

## ✅ Solution

This error occurs because:
1. The `VITE_API_BASE_URL` environment variable is not set in Netlify
2. Content Security Policy (CSP) headers need to allow connections to Render backend

## 🔧 Steps to Fix

### Step 1: Get Your Render Backend URL

1. Go to Render Dashboard: https://dashboard.render.com/web/srv-d473jimr433s738u1ehg
2. Look for the **"URL"** or **"Service URL"** - it should look like:
   - `https://nextstep-mentorship-backend.onrender.com` OR
   - `https://srv-d473jimr433s738u1ehg.onrender.com` OR
   - Similar format with `.onrender.com`

### Step 2: Set Environment Variable in Netlify

1. Go to Netlify Dashboard: https://app.netlify.com/projects/nextstep-mentorship/configuration/env
2. Click **"Add a variable"** or find existing `VITE_API_BASE_URL`
3. Set:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: Your Render backend URL (from Step 1)
   - Example: `https://nextstep-mentorship-backend.onrender.com`
4. Click **"Save"**

### Step 3: Redeploy Frontend

After setting the environment variable, you need to trigger a new deployment:

**Option A: Automatic (if connected to GitHub)**
- Just push any change to GitHub, or
- Go to Netlify dashboard → **"Deploys"** → **"Trigger deploy"** → **"Deploy site"**

**Option B: Manual Deploy**
```bash
# If you have Netlify CLI installed
netlify deploy --prod
```

### Step 4: Verify

1. Wait for deployment to complete (2-5 minutes)
2. Visit your frontend: https://nextstep-mentorship.netlify.app
3. Try logging in again
4. Check browser console (F12) - should no longer show CSP errors

## ✅ Code Changes Made

I've already updated the code to:
1. ✅ Add CSP headers in `netlify.toml` to allow Render backend connections
2. ✅ Improve error handling in `AuthContext.jsx` to show better error messages
3. ✅ Allow connections to `*.onrender.com` and `*.render.com` domains

## 🔍 Troubleshooting

### Still Getting CSP Error?

1. **Check the backend URL is correct:**
   - Visit your Render backend URL directly: `https://your-backend.onrender.com/api/health`
   - Should return a JSON response

2. **Verify environment variable is set:**
   - In Netlify dashboard, check that `VITE_API_BASE_URL` is set
   - Make sure there are no extra spaces or quotes

3. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache completely

4. **Check deployment logs:**
   - In Netlify dashboard → **"Deploys"** → Click on latest deploy → **"Deploy log"**
   - Look for any build errors

5. **Verify backend is running:**
   - Check Render dashboard for backend service status
   - Check backend logs for any errors

### Backend Connection Issues?

If the backend URL is correct but still can't connect:

1. **Check CORS configuration in backend:**
   - Backend should allow requests from `https://nextstep-mentorship.netlify.app`
   - Check `FRONTEND_URL` environment variable in Render

2. **Check backend logs:**
   - In Render dashboard → Your backend service → **"Logs"** tab
   - Look for CORS or connection errors

## 📝 Quick Checklist

- [ ] Got Render backend URL from dashboard
- [ ] Set `VITE_API_BASE_URL` in Netlify environment variables
- [ ] Triggered new deployment in Netlify
- [ ] Waited for deployment to complete
- [ ] Tested login again
- [ ] Checked browser console for errors

## 🔗 Useful Links

- **Netlify Environment Variables**: https://app.netlify.com/projects/nextstep-mentorship/configuration/env
- **Render Backend Dashboard**: https://dashboard.render.com/web/srv-d473jimr433s738u1ehg
- **Frontend URL**: https://nextstep-mentorship.netlify.app

