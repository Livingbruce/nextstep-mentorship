# Fix Database Connection Issue

## 🔴 Problem
Your backend is trying to connect to `localhost:5432`, which doesn't work on Render because:
- Render servers cannot access your local machine
- `localhost` on Render refers to the Render server itself, not your computer

## ✅ Solution: Use a Remote Database

### Option 1: Create PostgreSQL Database on Render (Recommended)

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Click "New +"** → **"PostgreSQL"**
3. **Configure**:
   - Name: `nextstep-mentorship-db`
   - Plan: Free tier (or paid)
   - Region: Same as your backend
4. **Click "Create Database"**
5. **Copy the Internal Database URL** (looks like: `postgresql://user:password@hostname:5432/dbname`)

### Option 2: Use Your Existing Remote Database

If you have a remote database (not localhost), you need:
- The remote hostname/IP address
- Port (usually 5432)
- Database name
- Username and password

**Connection string format:**
```
postgresql://username:password@hostname:5432/database_name
```

## 🔧 Fix Steps

### Step 1: Update DATABASE_URL in Render

1. Go to your backend service: https://dashboard.render.com/
2. Click on `nextstep-mentorship-backend`
3. Go to **"Environment"** tab
4. Find `DATABASE_URL` or add it if missing
5. **Replace** `postgresql://postgres:victor@localhost:5432/nurturers`
6. **With** your Render database URL (from Option 1) or your remote database URL
7. **Save**

### Step 2: Migrate Your Data (If Using New Render Database)

If you created a new database on Render, you need to migrate your data:

1. **Export from local database:**
```bash
pg_dump postgresql://postgres:victor@localhost:5432/nurturers > backup.sql
```

2. **Import to Render database:**
```bash
psql "your_render_database_url" < backup.sql
```

Or use Render Shell:
1. Go to Render Shell
2. Upload your backup.sql
3. Run: `psql $DATABASE_URL < backup.sql`

### Step 3: Verify Connection

After updating DATABASE_URL, the errors should stop. Check logs:
- Go to Render dashboard → Your service → Logs
- You should see: "Database connection successful" (if your code logs this)
- No more `ECONNREFUSED` errors

## 🚨 Important Notes

- **Never use `localhost` in production** - it only works on your local machine
- **Render databases** are automatically accessible from Render services
- **External databases** need to allow connections from Render's IP addresses
- **Free tier databases** on Render may spin down after inactivity

## 📝 Quick Checklist

- [ ] Create PostgreSQL database on Render (or have remote database URL)
- [ ] Copy the database connection URL
- [ ] Set `DATABASE_URL` in Render environment variables
- [ ] Migrate data if using new database
- [ ] Verify connection works (check logs)
- [ ] Test login functionality

