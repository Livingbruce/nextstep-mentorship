# Deployment Guide

## GitHub Setup

### Step 1: Create GitHub Repository

1. Go to https://github.com/new (or click "New repository" on GitHub)
2. Repository name: `nextstep-mentorship` (or your preferred name)
3. Description: "NextStep Mentorship Platform - Counseling and Therapy Services"
4. Choose **Public** or **Private**
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

### Step 2: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Run these in your terminal:

```bash
git remote add origin https://github.com/YOUR_USERNAME/nextstep-mentorship.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

## Netlify Setup

### Step 1: Login to Netlify

1. Go to https://app.netlify.com/teams/livingbruce/projects
2. Login with your Netlify account

### Step 2: Deploy from GitHub

1. Click "Add new site" → "Import an existing project"
2. Choose "Deploy with GitHub"
3. Authorize Netlify to access your GitHub account
4. Select the repository: `nextstep-mentorship`
5. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm install && npm run build`
   - **Publish directory**: `frontend/dist`
6. Click "Deploy site"

### Step 3: Environment Variables (if needed)

If your frontend needs environment variables:
1. Go to Site settings → Environment variables
2. Add any required variables (e.g., API URLs)

### Step 4: Custom Domain (Optional)

1. Go to Site settings → Domain management
2. Add your custom domain
3. Follow DNS configuration instructions

## Backend Deployment

**Note**: Netlify is for frontend static hosting. Your backend needs separate hosting:

### Recommended Backend Hosting Options:

1. **Render** (Recommended)
   - Go to https://render.com
   - Create a new Web Service
   - Connect your GitHub repository
   - Root directory: `backend`
   - Build command: `npm install`
   - Start command: `npm start`
   - Add environment variables from your `.env` file

2. **Railway**
   - Similar setup to Render
   - Good for Node.js applications

3. **Heroku**
   - Traditional option
   - Requires credit card for free tier

## Post-Deployment Checklist

- [ ] Frontend deployed on Netlify
- [ ] Backend deployed on Render/Railway/Heroku
- [ ] Environment variables configured
- [ ] Database connection working
- [ ] API endpoints accessible
- [ ] CORS configured correctly
- [ ] Custom domain set up (if applicable)

