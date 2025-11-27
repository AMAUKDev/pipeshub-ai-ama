# Rebuild Guide - With Validation Schema Fix

## What Changed

We fixed the Node.js validation schema to accept both old and new KB filter formats:

**File**: `backend/nodejs/apps/src/modules/enterprise_search/validators/es_validators.ts`

**Change**: Updated `kb` filter field from:
```typescript
kb: z.array(z.string().uuid()).optional()
```

To:
```typescript
kb: z.union([
  z.array(z.string().uuid()), // Old format
  z.object({
    kbIds: z.array(z.string().uuid()).optional(),
    folderIds: z.array(z.string().uuid()).optional(),
    fileIds: z.array(z.string().uuid()).optional(),
  }),
]).optional()
```

## Rebuild Strategy

Since we changed **Node.js backend code** (not just frontend), we need to rebuild the Node.js stage.

### Option A: Optimized Rebuild (Recommended - 5-8 minutes)

This rebuilds frontend + Node.js backend while preserving Python dependencies:

```powershell
# Stop containers
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai down

# Enable BuildKit and generate unique build ID
$env:DOCKER_BUILDKIT = 1
$buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"

# Rebuild with cache optimization
docker compose -f deployment/docker-compose/docker-compose.dev.yml build `
  --build-arg FRONTEND_BUILD_ID=$buildId `
  pipeshub-ai

# Start services
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai up -d

# View logs
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai
```

### Option B: One-Liner

```powershell
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai down; `
$env:DOCKER_BUILDKIT = 1; `
$buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml build --build-arg FRONTEND_BUILD_ID=$buildId pipeshub-ai; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai up -d; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai
```

## Build Cache Impact

```
Stage 1 (base)           → CACHED ✅
  System dependencies, Node.js, Rust
  
Stage 2 (python-deps)    → CACHED ✅
  Python packages (pyproject.toml unchanged)
  
Stage 3 (nodejs-backend) → REBUILD ❌
  Node.js backend code changed (es_validators.ts)
  
Stage 4 (frontend-build) → REBUILD ❌
  Frontend code changed (kb-filter-parser.ts, etc.)
  
Stage 5 (runtime)        → REBUILD ❌
  Depends on stages 3-4
```

**Total time**: 5-8 minutes (with cache optimization)

## Testing After Rebuild

1. **Frontend loads**: http://localhost:3000
2. **Open chat interface**
3. **Select a file** in the KB resource selector
4. **Send a message** with the file selected
5. **Expected result**: Message sent successfully (no validation error)
6. **Check logs** for filter parsing: `"Filters: kb_ids=X, folder_ids=Y, file_ids=Z"`

## Troubleshooting

### If build fails with TypeScript errors:
```powershell
# Full rebuild without cache
docker compose -f deployment/docker-compose/docker-compose.dev.yml build --no-cache pipeshub-ai
```

### If validation still fails:
```powershell
# Check logs for validation errors
docker compose -f deployment/docker-compose/docker-compose.dev.yml logs pipeshub-ai | Select-String "Expected array"
```

### If services won't start:
```powershell
# Check full logs
docker compose -f deployment/docker-compose/docker-compose.dev.yml logs pipeshub-ai | Out-File logs.txt
notepad logs.txt
```

## Files Changed

- ✅ `backend/nodejs/apps/src/modules/enterprise_search/validators/es_validators.ts`
  - Updated 3 schemas: `enterpriseSearchCreateSchema`, `addMessageParamsSchema`, `regenerateAnswersParamsSchema`
  - Added Zod union type for backward compatibility

- ✅ `.qodo/docs/kb_filtering.md`
  - Updated Phase 5 status
  - Added validation schema documentation

- ✅ `.qodo/VALIDATION_SCHEMA_FIX.md` (NEW)
  - Detailed explanation of the fix

## Summary

**Status**: ✅ READY FOR REBUILD

**Changes**: 1 Node.js file modified (validation schema)

**Rebuild time**: 5-8 minutes (optimized)

**Backward compatibility**: ✅ Full (both old and new formats supported)

**Next step**: Run the rebuild command above
