# Quick Deploy to Render via Command Line

## ⚠️ Important Note
Render doesn't have a CLI tool like Netlify. However, once you connect your GitHub repo through their web interface, it will **automatically deploy on every git push**!

## 🚀 One-Time Setup (Web Interface - 5 minutes)

### Step 1: Connect GitHub to Render
1. Go to: https://dashboard.render.com/
2. Click **"New +"** → **"Web Service"**
3. Click **"Connect GitHub"** (if not already connected)
4. Authorize Render to access your repositories
5. Select: **`Livingbruce/nextstep-mentorship`**

### Step 2: Configure Service
Use these exact settings:

```
Name: nextstep-mentorship-backend
Environment: Node
Region: (Choose closest)
Branch: main
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

### Step 3: Add Environment Variables
Click **"Environment"** tab and add:

```
NODE_ENV=production
PORT=10000
DATABASE_URL=your_postgresql_url
JWT_SECRET=your-secret-key
FRONTEND_URL=https://nextstep-mentorship.netlify.app
BOT_TOKEN=your_telegram_bot_token (if using)
```

### Step 4: Create & Deploy
Click **"Create Web Service"**

## ✅ After Setup - Automatic Deployments!

Once set up, **every time you push to GitHub**, Render will automatically:
- ✅ Detect the push
- ✅ Build your backend
- ✅ Deploy to production
- ✅ Update your live URL

**No more manual deployments needed!**

## 🔄 Deploy Now (Command Line)

Since you've already pushed to GitHub, if Render is connected, it's already deploying!

To trigger a new deployment:
```bash
git commit --allow-empty -m "Trigger Render deployment"
git push origin main
```

## 📝 Check Deployment Status

Visit: https://dashboard.render.com/
- Your service will show deployment status
- View logs in real-time
- Get your live URL

## 🔗 Your URLs

- **Frontend**: https://nextstep-mentorship.netlify.app
- **Backend**: https://nextstep-mentorship-backend.onrender.com (after deployment)
- **Render Dashboard**: https://dashboard.render.com/

