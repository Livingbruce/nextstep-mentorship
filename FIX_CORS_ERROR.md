# Fix CORS Error - Trailing Slash Issue

## 🔴 Problem

**Error Message:**
```
Access to fetch at 'https://nextstep-mentorship.onrender.com/api/auth/login' from origin 'https://nextstep-mentorship.netlify.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: The 'Access-Control-Allow-Origin' header has a value 'https://nextstep-mentorship.netlify.app/' that is not equal to the supplied origin.
```

**Root Cause:**
- Backend was returning: `Access-Control-Allow-Origin: https://nextstep-mentorship.netlify.app/` (with trailing slash)
- Browser was sending from: `https://nextstep-mentorship.netlify.app` (without trailing slash)
- CORS is strict - even a trailing slash mismatch causes failure

## ✅ Solution Applied

Updated `backend/src/index.js` to:
1. **Normalize origins** - Always remove trailing slashes
2. **Use dynamic CORS function** - Check and return normalized origin
3. **Always return origin without trailing slash** - Matches browser expectations

## 🔧 Required: Set FRONTEND_URL in Render

**Important:** Make sure `FRONTEND_URL` is set correctly in Render backend:

1. Go to: https://dashboard.render.com/web/srv-d473jimr433s738u1ehg
2. Click **"Environment"** tab
3. Find or add `FRONTEND_URL`
4. Set value to: `https://nextstep-mentorship.netlify.app` (NO trailing slash!)
5. Click **"Save Changes"**
6. Render will automatically redeploy

## 🧪 Verify Fix

After Render redeploys (2-5 minutes):

1. Visit: https://nextstep-mentorship.netlify.app
2. Open browser console (F12)
3. Try to login
4. Should NOT see CORS errors anymore
5. Login should work successfully

## 📝 Code Changes

The CORS configuration now:
- Normalizes all origins (removes trailing slashes)
- Uses a function to dynamically check origins
- Returns the normalized origin (without trailing slash) to match browser

```javascript
// Normalize frontend URL (remove trailing slash)
const normalizeOrigin = (origin) => {
  if (!origin) return origin;
  return origin.replace(/\/+$/, ''); // Remove trailing slashes
};

// CORS origin function
const corsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  const normalizedOrigin = normalizeOrigin(origin);
  if (allowedOrigins.some(allowed => normalizeOrigin(allowed) === normalizedOrigin)) {
    return callback(null, normalizedOrigin); // Always return without trailing slash
  }
  return callback(new Error('Not allowed by CORS'));
};
```

## 🔍 Troubleshooting

### If CORS error persists:

1. **Check FRONTEND_URL in Render:**
   - Should be: `https://nextstep-mentorship.netlify.app`
   - Should NOT have trailing slash
   - Should NOT have quotes

2. **Check Render deployment:**
   - Wait for redeploy to complete
   - Check logs for any errors
   - Verify environment variable is saved

3. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

4. **Check browser console:**
   - Look for the exact CORS error message
   - Verify the origin in the error matches your frontend URL

## 🔗 Quick Links

- **Render Backend Environment**: https://dashboard.render.com/web/srv-d473jimr433s738u1ehg/environment
- **Frontend URL**: https://nextstep-mentorship.netlify.app
- **Backend Health**: https://nextstep-mentorship.onrender.com/api/health

