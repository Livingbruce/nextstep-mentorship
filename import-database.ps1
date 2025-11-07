# Import Database to Render
# This script imports backup.sql to your Render database

$DATABASE_URL = "postgresql://nextstep_mentorship_db_user:b8WVAYPPTfEBJffTjzvOq24uTFGu21fd@dpg-d473u6ili9vc738fevl0-a/nextstep_mentorship_db"

Write-Host "🔄 Importing backup.sql to Render database..." -ForegroundColor Cyan
Write-Host ""

# Try with port 5432 (default PostgreSQL port)
Write-Host "Attempting connection..." -ForegroundColor Yellow

# Method 1: Try with explicit port
$urlWithPort = "postgresql://nextstep_mentorship_db_user:b8WVAYPPTfEBJffTjzvOq24uTFGu21fd@dpg-d473u6ili9vc738fevl0-a:5432/nextstep_mentorship_db"

try {
    $env:PGPASSWORD = "b8WVAYPPTfEBJffTjzvOq24uTFGu21fd"
    psql $urlWithPort -f backup.sql
    Write-Host "✅ Import successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Connection failed. Trying alternative method..." -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 You may need to:" -ForegroundColor Yellow
    Write-Host "1. Get the External Database URL from Render (not Internal)" -ForegroundColor White
    Write-Host "2. Or use Render Shell to import the file" -ForegroundColor White
    Write-Host ""
    Write-Host "Alternative: Use Render Shell:" -ForegroundColor Cyan
    Write-Host "1. Go to Render dashboard → Your backend service → Shell" -ForegroundColor White
    Write-Host "2. Upload backup.sql" -ForegroundColor White
    Write-Host "3. Run: psql `$DATABASE_URL < backup.sql" -ForegroundColor White
}

