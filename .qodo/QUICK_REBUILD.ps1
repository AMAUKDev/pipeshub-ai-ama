# Quick Rebuild Script for KB Filtering Changes
# This script rebuilds the Docker container with optimal cache usage

# Configuration
$COMPOSE_FILE = "deployment/docker-compose/docker-compose.dev.yml"
$PROJECT_NAME = "pipeshub-ai"
$SERVICE_NAME = "pipeshub-ai"

# Enable BuildKit for faster builds
$env:DOCKER_BUILDKIT = 1

# Generate unique build ID to invalidate frontend cache
$buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"

Write-Host "🚀 Starting KB Filtering Docker Rebuild" -ForegroundColor Green
Write-Host "Build ID: $buildId" -ForegroundColor Cyan
Write-Host ""

# Step 1: Stop containers
Write-Host "📦 Stopping containers..." -ForegroundColor Yellow
docker compose -f $COMPOSE_FILE -p $PROJECT_NAME down
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to stop containers" -ForegroundColor Red
    exit 1
}

# Step 2: Rebuild with cache optimization
Write-Host ""
Write-Host "🔨 Rebuilding Docker image (this may take 5-8 minutes)..." -ForegroundColor Yellow
Write-Host "   - Base layer: CACHED (system dependencies)" -ForegroundColor Gray
Write-Host "   - Python deps: CACHED (unless pyproject.toml changed)" -ForegroundColor Gray
Write-Host "   - Node.js backend: CACHED (unless package.json changed)" -ForegroundColor Gray
Write-Host "   - Frontend: REBUILDING (new build ID)" -ForegroundColor Cyan
Write-Host "   - Runtime: REBUILDING (depends on frontend)" -ForegroundColor Cyan
Write-Host ""

docker compose -f $COMPOSE_FILE build `
  --build-arg FRONTEND_BUILD_ID=$buildId `
  $SERVICE_NAME

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Step 3: Start services
Write-Host ""
Write-Host "🚀 Starting services..." -ForegroundColor Yellow
docker compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start services" -ForegroundColor Red
    exit 1
}

# Step 4: Wait for services to be ready
Write-Host ""
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Step 5: Show logs
Write-Host ""
Write-Host "📋 Service logs (press Ctrl+C to stop):" -ForegroundColor Green
Write-Host ""
docker compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f $SERVICE_NAME

# Cleanup on exit
Write-Host ""
Write-Host "✅ Rebuild complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Access the application at:" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Gray
Write-Host "  Backend API: http://localhost:8000" -ForegroundColor Gray
Write-Host "  Connector: http://localhost:8088" -ForegroundColor Gray
Write-Host "  Indexing: http://localhost:8091" -ForegroundColor Gray
