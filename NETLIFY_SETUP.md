# Netlify Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Code is Ready
- ✅ Git repository initialized
- ✅ Code pushed to GitHub
- ✅ All hardcoded localhost URLs replaced with environment variables
- ✅ Netlify configuration file created
- ✅ Build scripts configured

### 2. Environment Variables Needed

Before deploying, you'll need to set these in Netlify Dashboard:

1. Go to: **Site settings → Environment variables**
2. Add: `VITE_API_BASE_URL` = `https://your-backend-url.com`

**Important**: Replace `https://your-backend-url.com` with your actual backend URL (from Render, Railway, or Heroku).

### 3. Build Settings (Auto-detected from netlify.toml)

Netlify will automatically use:
- **Base directory**: `frontend`
- **Build command**: `npm install && npm run build`
- **Publish directory**: `frontend/dist`

### 4. Dependencies Check

All required dependencies are in `frontend/package.json`:
- ✅ React 19.1.1
- ✅ React Router DOM 6.28.0
- ✅ Axios 1.7.7
- ✅ Vite 7.1.5
- ✅ All dev dependencies

## 🚀 Deployment Steps

1. **Go to Netlify**: https://app.netlify.com/teams/livingbruce/projects
2. **Click**: "Add new site" → "Import an existing project"
3. **Select**: "Deploy with GitHub"
4. **Authorize**: Grant Netlify access to your GitHub
5. **Choose repository**: `Livingbruce/nextstep-mentorship`
6. **Configure** (if not auto-detected):
   - Base directory: `frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `frontend/dist`
7. **Add Environment Variable**:
   - Key: `VITE_API_BASE_URL`
   - Value: Your backend URL
8. **Click**: "Deploy site"

## ⚠️ Important Notes

1. **Backend URL**: Make sure your backend is deployed first and update `VITE_API_BASE_URL` in Netlify
2. **CORS**: Ensure your backend allows requests from your Netlify domain
3. **HTTPS**: Netlify provides HTTPS automatically
4. **Custom Domain**: You can add a custom domain in Site settings

## 🔧 Troubleshooting

### Build Fails
- Check Node version (should be 18+)
- Verify all dependencies in package.json
- Check build logs in Netlify dashboard

### API Calls Fail
- Verify `VITE_API_BASE_URL` is set correctly
- Check CORS settings on backend
- Ensure backend is running and accessible

### 404 Errors on Routes
- The `_redirects` file should handle this
- Verify `netlify.toml` redirects are correct

