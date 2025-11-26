#!/bin/bash

# Script to rebuild only the frontend without invalidating other build caches
# This uses a unique build argument to selectively invalidate only the frontend-build stage

set -e

echo "🔨 Rebuilding frontend with selective cache invalidation..."
echo "   (All other stages will use cached layers)"
echo ""

# Generate a unique build ID to invalidate frontend cache
BUILD_ID=$(date +%s%N)
echo "Build ID: $BUILD_ID"
echo ""

# Enable Docker BuildKit
export DOCKER_BUILDKIT=1

# Build with frontend-build stage cache invalidated via build argument
docker compose \
  -f deployment/docker-compose/docker-compose.dev.yml \
  build \
  --build-arg FRONTEND_BUILD_ID=$BUILD_ID \
  pipeshub-ai

echo ""
echo "✅ Frontend rebuild complete!"
echo ""
echo "To start the container with the new frontend:"
echo "  docker compose -f deployment/docker-compose/docker-compose.dev.yml up -d pipeshub-ai"
