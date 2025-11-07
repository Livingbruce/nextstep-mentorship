# Render Deployment Guide

## 🚀 Deploy Backend to Render

### Step 1: Create a New Web Service

1. Go to: https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account (if not already connected)
4. Select repository: **`Livingbruce/nextstep-mentorship`**

### Step 2: Configure the Service

**Basic Settings:**
- **Name**: `nextstep-mentorship-backend`
- **Environment**: `Node`
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### Step 3: Set Environment Variables

Click on **"Environment"** tab and add these variables:

**Required Variables:**
```
NODE_ENV=production
PORT=10000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your-super-secret-jwt-key-here
FRONTEND_URL=https://nextstep-mentorship.netlify.app
```

**Optional Variables (if using Telegram bot):**
```
BOT_TOKEN=your_telegram_bot_token
```

**Email Service (if using):**
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Step 4: Create PostgreSQL Database (if needed)

1. In Render dashboard, click **"New +"** → **"PostgreSQL"**
2. Name: `nextstep-mentorship-db`
3. Plan: Choose based on your needs (Free tier available)
4. Copy the **Internal Database URL**
5. Use this as your `DATABASE_URL` environment variable

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies
   - Build your application
   - Start the service

### Step 6: Get Your Backend URL

Once deployed, you'll get a URL like:
`https://nextstep-mentorship-backend.onrender.com`

### Step 7: Update Netlify Environment Variable

1. Go to Netlify: https://app.netlify.com/projects/nextstep-mentorship/configuration/env
2. Add/Update: `VITE_API_BASE_URL` = `https://nextstep-mentorship-backend.onrender.com`
3. Trigger a new deploy (or it will auto-deploy on next push)

## 🔧 Troubleshooting

### Build Fails
- Check that `backend/package.json` has correct scripts
- Verify Node version (should be 18+)
- Check build logs in Render dashboard

### Service Won't Start
- Verify `startCommand` is correct: `cd backend && npm start`
- Check environment variables are set
- Review service logs in Render dashboard

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database is running
- Ensure database allows connections from Render

### CORS Errors
- Make sure `FRONTEND_URL` is set correctly
- Check backend CORS configuration allows your Netlify domain

## 📝 Notes

- Render free tier spins down after 15 minutes of inactivity
- First request after spin-down may take 30-60 seconds
- Consider upgrading to paid plan for always-on service
- Database backups are recommended for production

