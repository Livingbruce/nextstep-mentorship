# Deployment Guide

## Netlify Deployment

This application is configured to deploy on Netlify with both frontend and backend.

### Automatic Deployment

1. Push to GitHub - Netlify will auto-deploy
2. Set environment variables in Netlify dashboard
3. Wait for deployment to complete

### Environment Variables

**Required Backend Variables:**
```
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-secret-key
NODE_ENV=production
FRONTEND_URL=https://your-site.netlify.app
```

**Optional Frontend Variable:**
```
VITE_API_BASE_URL=
```
Leave empty to use relative URLs (recommended - no CORS issues).

### How It Works

- **Frontend**: Served as static site from `frontend/dist/`
- **Backend**: Runs as Netlify Function at `/.netlify/functions/api`
- **API Routes**: `/api/*` redirects to Netlify Function
- **Same Domain**: No CORS issues!

### Testing

After deployment:
1. Visit: `https://your-site.netlify.app`
2. Test: `https://your-site.netlify.app/api/health`
3. Should return: `{"status":"ok"}`

### Troubleshooting

- Check Netlify build logs
- Verify environment variables are set
- Check function logs in Netlify dashboard
- Ensure database is accessible from Netlify

