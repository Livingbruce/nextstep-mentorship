# Import Database via Render Shell

## ✅ Best Method: Use Render Shell

Since the Internal Database URL only works within Render's network, we'll use Render Shell to import the backup.

### Step 1: Upload backup.sql to Render

1. Go to: https://dashboard.render.com/
2. Click on your **backend service** (`nextstep-mentorship-backend`)
3. Click **"Shell"** tab
4. In the Shell, run:
```bash
cd /opt/render/project/src
```

### Step 2: Upload backup.sql

You have two options:

**Option A: Use Render's file upload (if available)**
- Look for an upload button in the Shell interface

**Option B: Create the file directly**
- Copy the contents of your local `backup.sql` file
- In Render Shell, run:
```bash
cat > backup.sql << 'EOF'
```
- Then paste the entire contents of your backup.sql
- Press Enter, then type `EOF` and press Enter again

**Option C: Use git (easiest)**
- The backup.sql is already in your repo
- In Render Shell, it should be at: `/opt/render/project/src/backup.sql`
- Or navigate to where your code is deployed

### Step 3: Import the Backup

Once backup.sql is in the Render Shell, run:

```bash
psql $DATABASE_URL < backup.sql
```

This will import all your data!

### Step 4: Verify Import

Check that data was imported:

```bash
psql $DATABASE_URL -c "SELECT COUNT(*) FROM counselors;"
```

### Step 5: Update DATABASE_URL Environment Variable

1. Go to your backend service on Render
2. **Environment** tab
3. Set `DATABASE_URL` = `postgresql://nextstep_mentorship_db_user:b8WVAYPPTfEBJffTjzvOq24uTFGu21fd@dpg-d473u6ili9vc738fevl0-a/nextstep_mentorship_db`
4. **Save** (this will redeploy)

### Step 6: Test Login

After redeploy, test login at:
https://nextstep-mentorship.netlify.app

---

## Alternative: Get External Database URL

If you prefer to import from your local machine:

1. Go to your database on Render dashboard
2. Look for **"External Database URL"** or **"Connection Pooling"**
3. Use that URL instead (it's accessible from outside Render)
4. Then run: `psql "EXTERNAL_URL" < backup.sql`

