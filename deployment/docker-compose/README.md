# 🚀 Start the development deployment with build
docker compose -f docker-compose.dev.yml -p pipeshub-ai up --build -d

# 🛑 To stop the services
docker compose -f docker-compose.dev.yml -p pipeshub-ai down

# 2. Rebuild frontend only (preserves other caches)
docker compose -f docker-compose.dev.yml -p pipeshub-ai down
$env:DOCKER_BUILDKIT = 1; $buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"; docker compose -f docker-compose.dev.yml build --build-arg FRONTEND_BUILD_ID=$buildId pipeshub-ai
docker compose -f docker-compose.dev.yml -p pipeshub-ai up -d

# 3. Rebuild with a cache wipe:
docker compose -f docker-compose.dev.yml -p pipeshub-ai down
docker compose -f docker-compose.dev.yml build --no-cache pipeshub-ai
docker compose -f docker-compose.dev.yml -p pipeshub-ai up -d

# 4. Check logs
docker compose -f docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai