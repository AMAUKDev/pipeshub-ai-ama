# Docker Rebuild Guide - KB Filtering Implementation

## 📋 What Changed

Your changes affect **2 Docker build stages**:

1. **Frontend Stage** (Stage 4: `frontend-build`)
   - Modified: `frontend/src/sections/qna/chatbot/utils/kb-filter-parser.ts` (NEW)
   - Modified: `frontend/src/sections/qna/chatbot/components/chat-input.tsx`
   - Modified: `frontend/src/sections/qna/chatbot/chat-bot.tsx`

2. **Python Backend Stage** (Stage 2: `python-deps` → Stage 5: `runtime`)
   - Modified: `backend/python/app/modules/retrieval/retrieval_service.py`
   - Modified: `backend/python/app/connectors/services/kb_filtering_service.py` (NEW)
   - Modified: `backend/python/app/connectors/services/base_arango_service.py`

## 🚀 Optimal Rebuild Strategy

### Option 1: Rebuild Frontend Only (Fastest - 2-3 minutes)
Use this if you only want to test frontend changes without rebuilding Python dependencies.

```powershell
# Stop containers
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai down

# Rebuild frontend stage only (preserves all other caches)
$env:DOCKER_BUILDKIT = 1
$buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"
docker compose -f deployment/docker-compose/docker-compose.dev.yml build `
  --build-arg FRONTEND_BUILD_ID=$buildId `
  pipeshub-ai

# Start services
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai up -d

# Check logs
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai
```

**Why this works**: The `FRONTEND_BUILD_ID` build arg invalidates only the frontend stage cache, leaving Python dependencies untouched.

---

### Option 2: Rebuild Frontend + Python Backend (Recommended - 5-8 minutes)
Use this for full testing of KB filtering (frontend + backend changes).

```powershell
# Stop containers
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai down

# Rebuild with fresh Python dependencies but keep base layer cache
$env:DOCKER_BUILDKIT = 1
$buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"
docker compose -f deployment/docker-compose/docker-compose.dev.yml build `
  --build-arg FRONTEND_BUILD_ID=$buildId `
  pipeshub-ai

# Start services
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai up -d

# Check logs
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai
```

**Why this works**: 
- Base layer (Stage 1) is cached (system dependencies, Node.js, Rust)
- Python dependencies (Stage 2) are cached (NLTK, spaCy, sentence-transformers)
- Only frontend and Python app code are rebuilt
- Total rebuild time: ~5-8 minutes

---

### Option 3: Full Clean Rebuild (Slowest - 15-20 minutes)
Use this only if you encounter cache issues or need a completely fresh build.

```powershell
# Stop containers
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai down

# Full rebuild with no cache
docker compose -f deployment/docker-compose/docker-compose.dev.yml build --no-cache pipeshub-ai

# Start services
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai up -d

# Check logs
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai
```

**When to use**: Only if you see cache-related errors or need to ensure all dependencies are fresh.

---

## 🎯 Recommended Workflow

### For Testing KB Filtering Changes:

```powershell
# 1. Rebuild (5-8 minutes)
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai down
$env:DOCKER_BUILDKIT = 1
$buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"
docker compose -f deployment/docker-compose/docker-compose.dev.yml build `
  --build-arg FRONTEND_BUILD_ID=$buildId `
  pipeshub-ai

# 2. Start services
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai up -d

# 3. Wait for services to be ready (check logs)
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai

# 4. Test in browser
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# Connector: http://localhost:8088
# Indexing: http://localhost:8091
```

---

## 📊 Cache Layer Breakdown

```
Stage 1: base
├─ System dependencies (apt-get)
├─ Node.js 20
├─ Rust toolchain
└─ LibreOffice, OCR tools
   ↓ (CACHED - rarely changes)

Stage 2: python-deps
├─ Python dependencies (uv pip install)
├─ NLTK models
├─ spaCy models
└─ Sentence transformers
   ↓ (CACHED - only changes if pyproject.toml changes)

Stage 3: nodejs-backend
├─ Node.js dependencies (npm install)
└─ TypeScript compilation
   ↓ (CACHED - only changes if package.json changes)

Stage 4: frontend-build
├─ Frontend dependencies (npm install)
└─ Vite build
   ↓ (INVALIDATED by FRONTEND_BUILD_ID - always rebuilds)

Stage 5: runtime
├─ Copy compiled artifacts
└─ Copy Python app code
   ↓ (INVALIDATED when Stage 4 changes)
```

---

## ⚡ Performance Tips

### Tip 1: Use BuildKit
Always set `DOCKER_BUILDKIT=1` for faster builds:
```powershell
$env:DOCKER_BUILDKIT = 1
```

### Tip 2: Check What Changed
Before rebuilding, verify which files actually changed:
```powershell
git status
git diff backend/python/app/modules/retrieval/retrieval_service.py
```

### Tip 3: Monitor Build Progress
Watch the build in real-time:
```powershell
docker compose -f deployment/docker-compose/docker-compose.dev.yml build --progress=plain pipeshub-ai
```

### Tip 4: Prune Unused Images
If disk space is an issue:
```powershell
docker image prune -a --filter "until=24h"
```

---

## 🔍 Troubleshooting

### Issue: Build fails with "Python module not found"
**Solution**: Rebuild with fresh Python dependencies:
```powershell
docker compose -f deployment/docker-compose/docker-compose.dev.yml build --no-cache pipeshub-ai
```

### Issue: Frontend changes not showing
**Solution**: Ensure FRONTEND_BUILD_ID is unique:
```powershell
$buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"
docker compose -f deployment/docker-compose/docker-compose.dev.yml build `
  --build-arg FRONTEND_BUILD_ID=$buildId `
  pipeshub-ai
```

### Issue: Services won't start
**Solution**: Check logs and rebuild:
```powershell
docker compose -f deployment/docker-compose/docker-compose.dev.yml logs pipeshub-ai
docker compose -f deployment/docker-compose/docker-compose.dev.yml down
docker compose -f deployment/docker-compose/docker-compose.dev.yml up -d
```

---

## 📝 Summary

| Scenario | Command | Time | Cache |
|----------|---------|------|-------|
| Frontend only | Option 1 | 2-3 min | ✅ Preserves Python |
| Frontend + Backend | Option 2 | 5-8 min | ✅ Preserves base |
| Full clean | Option 3 | 15-20 min | ❌ No cache |

**Recommended**: Use **Option 2** for testing KB filtering changes (rebuilds both frontend and Python backend while preserving base layer cache).

---

## 🚀 Quick Start Command

Copy and paste this for immediate rebuild:

```powershell
# Stop, rebuild, and start
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai down; `
$env:DOCKER_BUILDKIT = 1; `
$buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml build --build-arg FRONTEND_BUILD_ID=$buildId pipeshub-ai; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai up -d; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai
```

This will:
1. Stop all containers
2. Rebuild with cache optimization
3. Start services
4. Show live logs for monitoring
