# 🚀 Start the development deployment with build
docker compose -f docker-compose.dev.yml -p pipeshub-ai up --build -d

# 🛑 To stop the services
docker compose -f docker-compose.dev.yml -p pipeshub-ai down

# 2. Rebuild frontend only (preserves other caches)
# This is the recommended approach when you've updated the frontend code
# It uses Docker BuildKit to selectively invalidate only the frontend-build stage

## Option A: Using the helper script (Recommended)
# Linux/macOS:
bash ../../scripts/rebuild-frontend.sh

# Windows PowerShell:
powershell -ExecutionPolicy Bypass -File ../../scripts/rebuild-frontend.ps1

## Option B: Manual command (Windows PowerShell)
$env:DOCKER_BUILDKIT = 1; $buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"; docker compose -f docker-compose.dev.yml build --build-arg FRONTEND_BUILD_ID=$buildId pipeshub-ai

## then rebuild
docker compose -f docker-compose.dev.yml -p pipeshub-ai up --build -d

## or is it? docker compose -f docker-compose.dev.yml up -d pipeshub-ai

# 3. Rebuild and restart Docker (full rebuild - clears all caches)
# Only use this when you need a complete rebuild from scratch
docker compose -f docker-compose.dev.yml -p pipeshub-ai down
docker compose -f docker-compose.dev.yml build --no-cache pipeshub-ai
docker compose -f docker-compose.dev.yml -p pipeshub-ai up -d

# 4. Check logs
docker compose -f docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai