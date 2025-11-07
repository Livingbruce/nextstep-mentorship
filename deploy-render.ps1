# Render Deployment Script
# This script helps deploy to Render using their API

Write-Host "🚀 Render Deployment Helper" -ForegroundColor Green
Write-Host ""

# Check if render.yaml exists
if (-not (Test-Path "render.yaml")) {
    Write-Host "❌ render.yaml not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ render.yaml found" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Go to: https://dashboard.render.com/" -ForegroundColor Cyan
Write-Host "2. Click 'New +' → 'Web Service'" -ForegroundColor Cyan
Write-Host "3. Connect GitHub and select: Livingbruce/nextstep-mentorship" -ForegroundColor Cyan
Write-Host "4. Configure:" -ForegroundColor Cyan
Write-Host "   - Root Directory: backend" -ForegroundColor White
Write-Host "   - Build Command: npm install" -ForegroundColor White
Write-Host "   - Start Command: npm start" -ForegroundColor White
Write-Host "5. Add environment variables (see RENDER_DEPLOYMENT.md)" -ForegroundColor Cyan
Write-Host "6. Click 'Create Web Service'" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Note: Render doesn't have a CLI like Netlify." -ForegroundColor Yellow
Write-Host "   Deployment is done through the web dashboard or GitHub integration." -ForegroundColor Yellow
Write-Host "   Once connected, it will auto-deploy on every git push!" -ForegroundColor Green

