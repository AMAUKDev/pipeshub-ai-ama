# 🚀 Start the development deployment with build
docker compose -f docker-compose.dev.yml -p pipeshub-ai up --build -d

# 🛑 To stop the services
docker compose -f docker-compose.dev.yml -p pipeshub-ai down

# 2. Rebuild and restart Docker
docker compose -f docker-compose.dev.yml -p pipeshub-ai down
docker compose -f docker-compose.dev.yml -p pipeshub-ai up --build -d

# 3. Check logs
docker compose -f docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai