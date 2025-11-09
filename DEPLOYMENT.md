# Deployment Guide (Vercel)

The repository hosts both the **frontend (Vite + React)** and the **backend (Express API + Telegram bot)**. Deploy each to its own Vercel project using the steps below.

---

## 1. Frontend (`frontend/`)

1. Create a new Vercel project and select the GitHub repository.
2. When prompted for the project root, choose `frontend`.
3. Build settings:
   - **Build Command:** `npm run build`
   - **Install Command:** `npm install`
   - **Output Directory:** `dist`
4. Environment variables (optional):
   - `VITE_API_BASE_URL` – leave empty to call the backend project directly using an absolute URL in runtime configuration.

After the first deployment finishes, note the generated production URL (e.g. `https://nextstep-mentorship-frontend.vercel.app`). Set this value as `FRONTEND_URL` in the backend project.

---

## 2. Backend (`backend/`)

1. Create a second Vercel project pointing to the same GitHub repo.
2. Set the project root to `backend`.
3. Build/Deployment settings:
   - **Build Command:** `npm install`
   - **Output Directory:** (leave empty)
   - Vercel detects the `api/index.js` serverless function automatically.
4. Environment variables (configure in Vercel dashboard):
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://<your-frontend-domain>`
   - `API_URL=https://<your-backend-domain>`
   - `LOCAL_API_URL` *(optional for local development)*
   - `ALLOWED_ORIGINS` *(optional comma-separated list for additional domains)*
   - `ALLOW_VERCEL_PREVIEWS=true` *(optional to allow any `https://*.vercel.app` origin)*
   - `BOT_TOKEN` *(optional – only if the Telegram bot should run inside Vercel; otherwise host the bot elsewhere)*

> **Note:** The backend uses `serverless-http` to expose the existing Express app through `backend/api/index.js`. The Telegram bot only launches when `process.env.BOT_TOKEN` is set and Vercel is not running (see `src/index.js`).

---

## 3. Local Development

1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Verify the API URL used by the bot and the frontend:
   - Frontend uses `VITE_API_BASE_URL`
   - Bot uses `LOCAL_API_URL` (fallback `http://localhost:5000`)

---

## 4. Post-Deployment Checklist

- Frontend loads at the Vercel domain and calls the backend without CORS errors.
- Backend responds at `https://<backend-domain>/api/health` with `{"status":"ok"}`.
- Telegram bot commands (Activities, Announcements, Books) fetch data successfully.
- Environment variables are set in both projects.

---

## 5. Troubleshooting

- Check Vercel build logs for each project.
- Confirm that the backend project has the correct environment variables.
- Verify that `API_URL` points to the deployed backend domain.
- For local bot testing, set `LOCAL_API_URL=http://localhost:5000`.
