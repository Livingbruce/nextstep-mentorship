# Deploy with New Render Database

## ✅ Code Changes Completed

The codebase has been updated to work with the new Render PostgreSQL database:

1. **Database Connection (`backend/src/db/pool.js`)**
   - Automatically enables SSL for Render databases (required)
   - Detects Render databases by hostname (`.render.com` or `dpg-`)
   - Handles connection strings properly

2. **Render Configuration (`render.yaml`)**
   - Updated with environment variable documentation
   - Ready for deployment

## 🔧 Required Steps in Render Dashboard

### Step 1: Update Backend Environment Variables

1. Go to: https://dashboard.render.com/web/srv-d473jimr433s738u1ehg
2. Click on **"Environment"** tab
3. Add/Update the following environment variables:

#### Required Variables:
```
DATABASE_URL=postgresql://nextstep_mentorship_db_user:b8WVAYPPTfEBJffTjzvOq24uTFGu21fd@dpg-d473u6ili9vc738fevl0-a.singapore-postgres.render.com/nextstep_mentorship_db
```

**OR** use the Internal Database URL (faster, same region):
```
DATABASE_URL=postgresql://nextstep_mentorship_db_user:b8WVAYPPTfEBJffTjzvOq24uTFGu21fd@dpg-d473u6ili9vc738fevl0-a/nextstep_mentorship_db
```

#### Other Required Variables (if not already set):
```
NODE_ENV=production
PORT=10000
JWT_SECRET=your-super-secret-jwt-key-here
FRONTEND_URL=https://nextstep-mentorship.netlify.app
```

#### Optional Variables (if using):
```
BOT_TOKEN=your_telegram_bot_token
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

4. Click **"Save Changes"**

### Step 2: Trigger Deployment

After saving environment variables, Render will automatically:
- Detect the changes
- Trigger a new deployment
- Build and deploy with the new database connection

**OR** manually trigger:
1. Go to **"Manual Deploy"** tab
2. Click **"Deploy latest commit"**

### Step 3: Verify Deployment

1. Check the **"Logs"** tab for any errors
2. The backend should connect to the new database automatically
3. Test the API endpoints

## 📊 Database Status

✅ **Database Import Completed**
- All tables created
- All data imported
- All indexes and constraints set up
- Ready to use

**Database Details:**
- **External URL**: `postgresql://nextstep_mentorship_db_user:b8WVAYPPTfEBJffTjzvOq24uTFGu21fd@dpg-d473u6ili9vc738fevl0-a.singapore-postgres.render.com/nextstep_mentorship_db`
- **Internal URL**: `postgresql://nextstep_mentorship_db_user:b8WVAYPPTfEBJffTjzvOq24uTFGu21fd@dpg-d473u6ili9vc738fevl0-a/nextstep_mentorship_db`
- **Dashboard**: https://dashboard.render.com/d/dpg-d473u6ili9vc738fevl0-a

## 🔗 Service Links

- **Render Backend**: https://dashboard.render.com/web/srv-d473jimr433s738u1ehg
- **Render Database**: https://dashboard.render.com/d/dpg-d473u6ili9vc738fevl0-a
- **Netlify Frontend**: https://app.netlify.com/projects/nextstep-mentorship/overview
- **GitHub Repository**: https://github.com/Livingbruce/nextstep-mentorship

## 🚀 Next Steps

1. ✅ Code updated and pushed to GitHub
2. ⏳ Set `DATABASE_URL` in Render dashboard (see Step 1 above)
3. ⏳ Wait for deployment to complete
4. ⏳ Test the application

## 🔍 Troubleshooting

### If deployment fails:
1. Check Render logs for errors
2. Verify `DATABASE_URL` is set correctly
3. Ensure SSL is enabled (handled automatically by code)
4. Check database is accessible from Render

### If connection fails:
1. Verify the database URL is correct
2. Check database is running in Render dashboard
3. Ensure the database user has proper permissions
4. Check firewall/network settings

## 📝 Notes

- The code automatically enables SSL for Render databases
- Use the **Internal Database URL** when backend and database are in the same region (faster)
- Use the **External Database URL** when connecting from outside Render
- All environment variables should be set in Render dashboard, not in code

