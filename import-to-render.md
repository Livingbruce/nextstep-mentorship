# Import Database to Render - Step by Step

## Prerequisites
✅ backup.sql file is ready (found in project root)
✅ You have psql installed locally

## Step 1: Get Your Render Database URL

1. Go to: https://dashboard.render.com/
2. Find your PostgreSQL database (or create one if you haven't)
3. Click on the database
4. Go to **"Connections"** or **"Info"** tab
5. Copy the **"Internal Database URL"** (looks like: `postgresql://user:password@hostname:5432/dbname`)

**Important**: Use the **Internal Database URL**, not the External one (for security)

## Step 2: Import the Backup

Once you have the Render database URL, run this command:

```bash
psql "YOUR_RENDER_DATABASE_URL" < backup.sql
```

Replace `YOUR_RENDER_DATABASE_URL` with the actual URL from Step 1.

## Step 3: Verify Import

After import, verify your data:

```bash
psql "YOUR_RENDER_DATABASE_URL" -c "SELECT COUNT(*) FROM counselors;"
```

This should show the number of users in your database.

## Step 4: Update DATABASE_URL in Render

1. Go to your backend service on Render
2. Environment tab
3. Set `DATABASE_URL` to the same Internal Database URL
4. Save (this will trigger a redeploy)

## Step 5: Test Login

After the redeploy completes, try logging in at:
https://nextstep-mentorship.netlify.app

---

**Note**: If you get connection errors, make sure:
- The database URL is correct
- The database is running (not sleeping)
- You're using the Internal Database URL (not External)

