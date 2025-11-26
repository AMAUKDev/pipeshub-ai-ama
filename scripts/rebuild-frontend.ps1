# Script to rebuild only the frontend without invalidating other build caches
# This uses a unique build argument to selectively invalidate only the frontend-build stage

Write-Host "🔨 Rebuilding frontend with selective cache invalidation..." -ForegroundColor Cyan
Write-Host "   (All other stages will use cached layers)" -ForegroundColor Gray
Write-Host ""

# Generate a unique build ID to invalidate frontend cache
$buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"
Write-Host "Build ID: $buildId" -ForegroundColor Gray

# Enable Docker BuildKit
$env:DOCKER_BUILDKIT = 1

# Build with frontend-build stage cache invalidated via build argument
docker compose `
  -f deployment/docker-compose/docker-compose.dev.yml `
  build `
  --build-arg FRONTEND_BUILD_ID=$buildId `
  pipeshub-ai

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Frontend rebuild complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To start the container with the new frontend:" -ForegroundColor Cyan
    Write-Host "  docker compose -f deployment/docker-compose/docker-compose.dev.yml up -d pipeshub-ai"
} else {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
