# Docker Cache Strategy - Detailed Explanation

## 🎯 Why Cache Matters

Your Docker build has **5 stages**, each taking different amounts of time:

| Stage | Name | Time | Frequency |
|-------|------|------|-----------|
| 1 | `base` | 3-5 min | Rarely changes |
| 2 | `python-deps` | 4-6 min | Changes with pyproject.toml |
| 3 | `nodejs-backend` | 2-3 min | Changes with package.json |
| 4 | `frontend-build` | 2-3 min | Changes with frontend code |
| 5 | `runtime` | <1 min | Depends on stages 2-4 |

**Total time**: 15-20 minutes (full rebuild) vs 5-8 minutes (optimized rebuild)

---

## 🔄 How Docker Cache Works

Docker caches layers based on:
1. **Base image** (FROM statement)
2. **Commands** (RUN, COPY, ADD)
3. **Build arguments** (ARG)

If any of these change, the layer and all subsequent layers are invalidated.

### Example: Without Optimization
```dockerfile
FROM python:3.10-slim AS base
# ... install dependencies ...

FROM base AS python-deps
COPY ./backend/python/pyproject.toml /app/python/
RUN uv pip install --system -e .

FROM base AS frontend-build
ARG FRONTEND_BUILD_ID=default
COPY frontend/ ./
RUN npm run build  # ← Always rebuilds because COPY changes

FROM python-deps AS runtime
COPY --from=frontend-build /app/frontend/dist ./backend/dist/public
# ↑ This invalidates because frontend-build changed
```

**Result**: Changing frontend code invalidates Python dependencies cache ❌

### Example: With Optimization (Current Setup)
```dockerfile
FROM base AS frontend-build
ARG FRONTEND_BUILD_ID=default  # ← Unique per build
RUN echo "Frontend build ID: $FRONTEND_BUILD_ID"  # ← Invalidates only this stage
COPY frontend/ ./
RUN npm run build

FROM python-deps AS runtime
COPY --from=frontend-build /app/frontend/dist ./backend/dist/public
# ↑ Python-deps is still cached!
```

**Result**: Changing frontend code only rebuilds frontend stage ✅

---

## 📊 Cache Invalidation Scenarios

### Scenario 1: Frontend Changes Only
**Files changed**: `chat-bot.tsx`, `kb-filter-parser.ts`, `chat-input.tsx`

```
Stage 1 (base)           → CACHED ✅
Stage 2 (python-deps)    → CACHED ✅
Stage 3 (nodejs-backend) → CACHED ✅
Stage 4 (frontend-build) → INVALIDATED ❌ (FRONTEND_BUILD_ID changed)
Stage 5 (runtime)        → INVALIDATED ❌ (depends on stage 4)

Time: 2-3 minutes
```

**Command**:
```powershell
$env:DOCKER_BUILDKIT = 1
$buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"
docker compose build --build-arg FRONTEND_BUILD_ID=$buildId pipeshub-ai
```

---

### Scenario 2: Python Backend Changes Only
**Files changed**: `retrieval_service.py`, `kb_filtering_service.py`, `base_arango_service.py`

```
Stage 1 (base)           → CACHED ✅
Stage 2 (python-deps)    → CACHED ✅ (pyproject.toml unchanged)
Stage 3 (nodejs-backend) → CACHED ✅
Stage 4 (frontend-build) → CACHED ✅ (FRONTEND_BUILD_ID unchanged)
Stage 5 (runtime)        → INVALIDATED ❌ (COPY backend/python/app/ changed)

Time: <1 minute
```

**Command**:
```powershell
docker compose build pipeshub-ai
```

---

### Scenario 3: Both Frontend and Backend Changes
**Files changed**: Frontend + Python backend files

```
Stage 1 (base)           → CACHED ✅
Stage 2 (python-deps)    → CACHED ✅
Stage 3 (nodejs-backend) → CACHED ✅
Stage 4 (frontend-build) → INVALIDATED ❌ (FRONTEND_BUILD_ID changed)
Stage 5 (runtime)        → INVALIDATED ❌ (depends on stage 4)

Time: 5-8 minutes
```

**Command**:
```powershell
$env:DOCKER_BUILDKIT = 1
$buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"
docker compose build --build-arg FRONTEND_BUILD_ID=$buildId pipeshub-ai
```

---

### Scenario 4: Dependencies Changed
**Files changed**: `pyproject.toml` or `package.json`

```
Stage 1 (base)           → CACHED ✅
Stage 2 (python-deps)    → INVALIDATED ❌ (COPY pyproject.toml changed)
Stage 3 (nodejs-backend) → INVALIDATED ❌ (COPY package.json changed)
Stage 4 (frontend-build) → INVALIDATED ❌ (COPY package.json changed)
Stage 5 (runtime)        → INVALIDATED ❌ (depends on stages 2-4)

Time: 15-20 minutes (full rebuild)
```

**Command**:
```powershell
docker compose build --no-cache pipeshub-ai
```

---

## 🛠️ BuildKit Optimization

The `DOCKER_BUILDKIT=1` environment variable enables:

1. **Parallel stage building**: Stages 2, 3, 4 build simultaneously
2. **Better caching**: Smarter layer caching algorithm
3. **Inline cache**: Stores cache metadata in image
4. **Faster builds**: ~30-40% faster than legacy builder

### Without BuildKit
```
Stage 1 → Stage 2 → Stage 3 → Stage 4 → Stage 5
(sequential, slower)
```

### With BuildKit
```
Stage 1 → Stage 2 ┐
         Stage 3 ├→ Stage 5
         Stage 4 ┘
(parallel, faster)
```

---

## 📈 Real-World Performance

### Your KB Filtering Changes

**Scenario**: Frontend + Backend changes (your current situation)

#### Without Optimization
```
Full rebuild: 15-20 minutes
- Base layer: 3-5 min
- Python deps: 4-6 min
- Node.js backend: 2-3 min
- Frontend: 2-3 min
- Runtime: <1 min
```

#### With Optimization (Recommended)
```
Optimized rebuild: 5-8 minutes
- Base layer: CACHED (0 min)
- Python deps: CACHED (0 min)
- Node.js backend: CACHED (0 min)
- Frontend: 2-3 min (rebuilt)
- Runtime: <1 min (rebuilt)
```

**Savings**: 7-12 minutes per rebuild! 🚀

---

## 🎯 Best Practices

### ✅ DO:
- Use `DOCKER_BUILDKIT=1` for all builds
- Use unique `FRONTEND_BUILD_ID` for frontend changes
- Check what files changed before rebuilding
- Use `--no-cache` only when necessary
- Keep dependencies stable (don't change pyproject.toml often)

### ❌ DON'T:
- Use `--no-cache` for every build (wastes time)
- Rebuild without BuildKit (slower)
- Change base image frequently
- Modify Dockerfile structure unnecessarily

---

## 🔍 Monitoring Cache Usage

### Check image size
```powershell
docker images | grep pipeshub-ai
```

### Check build layers
```powershell
docker history pipeshub-ai:latest
```

### Check cache status during build
```powershell
$env:DOCKER_BUILDKIT = 1
docker compose build --progress=plain pipeshub-ai
```

Look for:
- `CACHED` = Layer was reused ✅
- `DONE` = Layer was rebuilt ❌

---

## 📝 Summary

| Aspect | Impact | Solution |
|--------|--------|----------|
| Frontend changes | Invalidates stages 4-5 | Use FRONTEND_BUILD_ID |
| Backend changes | Invalidates stage 5 only | No special handling needed |
| Dependency changes | Invalidates stages 2-5 | Use --no-cache |
| Base image changes | Invalidates all stages | Rare, use --no-cache |

**For your KB filtering changes**: Use the optimized rebuild command to save 7-12 minutes per build cycle.

---

## 🚀 Next Steps

1. Run the quick rebuild script:
   ```powershell
   .\.qodo\QUICK_REBUILD.ps1
   ```

2. Monitor the build output for `CACHED` indicators

3. Test the KB filtering functionality in the browser

4. If issues occur, check logs:
   ```powershell
   docker compose -f deployment/docker-compose/docker-compose.dev.yml logs pipeshub-ai
   ```
