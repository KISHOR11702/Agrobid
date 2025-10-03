# AgroBid Project Startup Script
Write-Host "🌾 Starting AgroBid Application..." -ForegroundColor Green

# Function to check if a process is running on a specific port
function Test-Port {
    param($Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue
        return $connection.TcpTestSucceeded
    } catch {
        return $false
    }
}

# Kill existing processes on ports if they exist
Write-Host "🔄 Checking for existing processes..." -ForegroundColor Yellow

if (Test-Port 5000) {
    Write-Host "⚠️  Port 5000 is in use, attempting to free it..." -ForegroundColor Yellow
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

if (Test-Port 3000) {
    Write-Host "⚠️  Port 3000 is in use, attempting to free it..." -ForegroundColor Yellow
    Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}

# Start MongoDB (if not running as service)
Write-Host "🍃 Starting MongoDB..." -ForegroundColor Cyan
try {
    Start-Service -Name MongoDB -ErrorAction SilentlyContinue
    Write-Host "✅ MongoDB service started" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  MongoDB service not found or already running" -ForegroundColor Yellow
}

# Wait a moment for services to start
Start-Sleep -Seconds 2

# Start Backend Server
Write-Host "🚀 Starting Backend Server (Port 5000)..." -ForegroundColor Cyan
$backendPath = Join-Path $PSScriptRoot "backend"
Start-Process PowerShell -ArgumentList @(
    "-NoExit",
    "-Command", 
    "cd '$backendPath'; Write-Host '🔧 Backend Server Starting...' -ForegroundColor Blue; npm start"
) -WindowStyle Normal

# Wait for backend to start
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start Frontend Server
Write-Host "🎨 Starting Frontend Server (Port 3000)..." -ForegroundColor Cyan
$frontendPath = Join-Path $PSScriptRoot "frontend"
Start-Process PowerShell -ArgumentList @(
    "-NoExit",
    "-Command", 
    "cd '$frontendPath'; Write-Host '🎨 Frontend Server Starting...' -ForegroundColor Blue; npm start"
) -WindowStyle Normal

# Wait for frontend to start
Write-Host "⏳ Waiting for frontend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Check if servers are running
Write-Host "`n🔍 Checking server status..." -ForegroundColor Cyan

if (Test-Port 5000) {
    Write-Host "✅ Backend Server: Running on http://localhost:5000" -ForegroundColor Green
} else {
    Write-Host "❌ Backend Server: Not responding on port 5000" -ForegroundColor Red
}

if (Test-Port 3000) {
    Write-Host "✅ Frontend Server: Running on http://localhost:3000" -ForegroundColor Green
    
    # Open browser
    Write-Host "🌐 Opening browser..." -ForegroundColor Cyan
    Start-Process "http://localhost:3000"
} else {
    Write-Host "❌ Frontend Server: Not responding on port 3000" -ForegroundColor Red
}

Write-Host "`n🎉 AgroBid Application Setup Complete!" -ForegroundColor Green
Write-Host "📝 Available URLs:" -ForegroundColor Yellow
Write-Host "   • Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   • Backend:  http://localhost:5000" -ForegroundColor White
Write-Host "`n💡 Features Available:" -ForegroundColor Yellow
Write-Host "   • ✨ Real-time bidding with WebSocket" -ForegroundColor White
Write-Host "   • 📅 Bidding end date system" -ForegroundColor White
Write-Host "   • 🏆 Live bid tracking and notifications" -ForegroundColor White
Write-Host "   • 📱 Modern responsive UI" -ForegroundColor White
Write-Host "`nPress any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
