# Deploy Backend to Netlify (Eliminates CORS Issues)

## 🎯 Why Deploy Backend to Netlify?

**Problem**: CORS issues persist with Render backend
**Solution**: Deploy backend to Netlify - same domain as frontend = **NO CORS needed!**

When frontend and backend are on the same domain (`*.netlify.app`), browsers don't enforce CORS policies.

## ✅ Benefits

1. **No CORS issues** - Same domain = no cross-origin requests
2. **Simpler configuration** - No CORS headers needed
3. **Better performance** - Same CDN, faster requests
4. **Easier debugging** - All logs in one place

## 📋 Prerequisites

- Netlify account (you already have this)
- Backend code ready
- Database accessible from Netlify Functions

## 🚀 Option 1: Netlify Functions (Recommended)

### Step 1: Create Netlify Functions Structure

```bash
mkdir -p backend/netlify/functions
```

### Step 2: Create Serverless Function Wrapper

Create `backend/netlify/functions/api.js`:

```javascript
import express from 'express';
import serverless from 'serverless-http';
import app from '../../src/index.js';

export const handler = serverless(app);
```

### Step 3: Install Dependencies

```bash
cd backend
npm install serverless-http
```

### Step 4: Update netlify.toml

Add to your existing `netlify.toml`:

```toml
[build]
  base = "frontend"
  publish = "dist"
  command = "cd frontend && npm install && npm run build"

[functions]
  directory = "backend/netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Step 5: Deploy

1. Push to GitHub
2. Netlify will auto-deploy
3. Backend will be available at: `https://nextstep-mentorship.netlify.app/api/*`

## 🚀 Option 2: Separate Netlify Site for Backend

### Step 1: Create New Netlify Site

1. Go to: https://app.netlify.com/
2. Click "Add new site" → "Import an existing project"
3. Connect GitHub repository
4. Select: `Livingbruce/nextstep-mentorship`

### Step 2: Configure Build Settings

**Base directory**: `backend`
**Build command**: `npm install`
**Publish directory**: `.` (or leave empty)

### Step 3: Set Environment Variables

Go to Site settings → Environment variables:

```
DATABASE_URL=postgresql://nextstep_mentorship_db_user:b8WVAYPPTfEBJffTjzvOq24uTFGu21fd@dpg-d473u6ili9vc738fevl0-a.singapore-postgres.render.com/nextstep_mentorship_db
NODE_ENV=production
PORT=8888
JWT_SECRET=your-secret-key
FRONTEND_URL=https://nextstep-mentorship.netlify.app
```

### Step 4: Create netlify.toml for Backend

Create `backend/netlify.toml`:

```toml
[build]
  base = "."
  command = "npm install"
  publish = "."

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/server"
  status = 200
```

### Step 5: Create Netlify Function

Create `netlify/functions/server.js`:

```javascript
import express from 'express';
import serverless from 'serverless-http';
import app from '../../backend/src/index.js';

export const handler = serverless(app);
```

### Step 6: Update Frontend API URL

In Netlify frontend environment variables:
```
VITE_API_BASE_URL=https://your-backend-site.netlify.app
```

## 🔧 Option 3: Use Netlify Edge Functions (Advanced)

For even better performance, use Edge Functions.

## 📝 Quick Setup Script

Run this to set up Netlify Functions:

```bash
# Create functions directory
mkdir -p backend/netlify/functions

# Install serverless-http
cd backend
npm install serverless-http

# Create API function
cat > netlify/functions/api.js << 'EOF'
import express from 'express';
import serverless from 'serverless-http';
import app from '../../src/index.js';

export const handler = serverless(app);
EOF
```

## 🎯 Recommended Approach

**Use Option 1 (Netlify Functions)** - It's the simplest and keeps everything in one deployment.

## ⚠️ Important Notes

1. **Database Connection**: Make sure your database allows connections from Netlify IPs
2. **Environment Variables**: Set all required vars in Netlify dashboard
3. **Function Timeout**: Netlify Functions have a 10s timeout (26s on Pro)
4. **Cold Starts**: First request may be slower (cold start)

## 🔍 After Deployment

1. Test API: `https://your-site.netlify.app/api/health`
2. Update frontend `VITE_API_BASE_URL` to point to Netlify backend
3. Test login - should work without CORS errors!

## 📚 Resources

- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
- [Serverless Express](https://github.com/vendia/serverless-express)

