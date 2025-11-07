# Database Setup Guide for Render

## 🔴 Issue: Login Not Working

The login is failing because:
1. The production database on Render is empty (no users)
2. Database tables might not be created yet

## ✅ Solution: Set Up Database

### Step 1: Create PostgreSQL Database on Render

1. Go to: https://dashboard.render.com/
2. Click **"New +"** → **"PostgreSQL"**
3. Name: `nextstep-mentorship-db`
4. Plan: Choose based on your needs (Free tier available)
5. Click **"Create Database"**
6. **Copy the Internal Database URL** (you'll need this)

### Step 2: Set DATABASE_URL in Render

1. Go to your backend service on Render
2. Click **"Environment"** tab
3. Add/Update: `DATABASE_URL` = (paste the Internal Database URL from Step 1)
4. Save

### Step 3: Create Database Tables

You have two options:

#### Option A: Using Render Shell (Recommended)

1. In Render dashboard, go to your backend service
2. Click **"Shell"** tab
3. Run these commands:

```bash
cd backend
psql $DATABASE_URL -f seed/optimized_schema.sql
```

#### Option B: Using Local Script

1. Set DATABASE_URL locally:
```bash
export DATABASE_URL="your_render_database_url"
```

2. Run the schema:
```bash
cd backend
psql $DATABASE_URL -f seed/optimized_schema.sql
```

### Step 4: Create Admin User

After tables are created, create your admin user:

#### Option A: Using Render Shell

1. In Render Shell, run:
```bash
cd backend
node create-admin-user.js
```

#### Option B: Using Local Script

1. Set DATABASE_URL:
```bash
export DATABASE_URL="your_render_database_url"
```

2. Run:
```bash
cd backend
node create-admin-user.js
```

This will create:
- **Email**: vicymbrush@gmail.com
- **Password**: 123456
- **Admin**: Yes

### Step 5: Verify

1. Try logging in at: https://nextstep-mentorship.netlify.app
2. Use: vicymbrush@gmail.com / 123456

## 🔧 Alternative: Quick Test Script

If you want to test the database connection first, create a test file:

```javascript
// test-db.js
import pool from './src/db/pool.js';

async function test() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Connected:', result.rows[0]);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit();
}

test();
```

Run: `node test-db.js`

## 📝 Important Notes

- **DATABASE_URL** must be set in Render environment variables
- Database tables must exist before creating users
- The `optimized_schema.sql` file contains all table definitions
- After setup, your user will be able to login

## 🆘 Troubleshooting

### "relation counselors does not exist"
- Run the schema SQL file first
- Check DATABASE_URL is correct

### "password authentication failed"
- Verify DATABASE_URL is correct
- Check database credentials in Render

### "connection refused"
- Database might be sleeping (free tier)
- Wait 30-60 seconds and try again
- Check database is running in Render dashboard

