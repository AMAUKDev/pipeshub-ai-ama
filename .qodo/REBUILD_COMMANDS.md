# Docker Rebuild Commands - Copy & Paste Ready

## 🚀 Recommended: Optimized Rebuild (5-8 minutes)

**Use this for KB filtering changes (frontend + backend)**

```powershell
# One-liner without logs
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai down; `
$env:DOCKER_BUILDKIT = 1; `
$buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml build --build-arg FRONTEND_BUILD_ID=$buildId pipeshub-ai; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai up -d

# One-liner (copy and paste entire block)
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai down; `
$env:DOCKER_BUILDKIT = 1; `
$buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml build --build-arg FRONTEND_BUILD_ID=$buildId pipeshub-ai; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai up -d; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai
```

**Or step-by-step:**

```powershell
# Step 1: Stop containers
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai down

# Step 2: Enable BuildKit and generate unique build ID
$env:DOCKER_BUILDKIT = 1
$buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"

# Step 3: Rebuild with cache optimization
docker compose -f deployment/docker-compose/docker-compose.dev.yml build `
  --build-arg FRONTEND_BUILD_ID=$buildId `
  pipeshub-ai

# Step 4: Start services
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai up -d

# Step 5: View logs
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai
```

---

## 🔄 Frontend Only Rebuild (2-3 minutes)

**Use this if you only changed frontend files**

```powershell
# One-liner
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai down; `
$env:DOCKER_BUILDKIT = 1; `
$buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml build --build-arg FRONTEND_BUILD_ID=$buildId pipeshub-ai; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai up -d; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai
```

---

## 🧹 Full Clean Rebuild (15-20 minutes)

**Use this only if you encounter cache issues**

```powershell
# One-liner
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai down; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml build --no-cache pipeshub-ai; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai up -d; `
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai
```

**Or step-by-step:**

```powershell
# Step 1: Stop containers
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai down

# Step 2: Full rebuild without cache
docker compose -f deployment/docker-compose/docker-compose.dev.yml build --no-cache pipeshub-ai

# Step 3: Start services
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai up -d

# Step 4: View logs
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai
```

---

## 📋 Utility Commands

### Stop all services
```powershell
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai down
```

### Start services (without rebuild)
```powershell
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai up -d
```

### View logs
```powershell
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai
```

### View logs for specific service
```powershell
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai | grep "retrieval"
```

### Check container status
```powershell
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai ps
```

### Rebuild specific service
```powershell
docker compose -f deployment/docker-compose/docker-compose.dev.yml build pipeshub-ai
```

### Prune unused images (free up disk space)
```powershell
docker image prune -a --filter "until=24h"
```

### Check image size
```powershell
docker images | grep pipeshub-ai
```

### Remove all pipeshub-ai images
```powershell
docker rmi $(docker images -q pipeshub-ai)
```

---

## 🎯 Decision Tree

```
Did you change files?
│
├─ Frontend only (chat-bot.tsx, kb-filter-parser.ts, chat-input.tsx)
│  └─ Use: Optimized Rebuild (2-3 min)
│
├─ Backend only (retrieval_service.py, kb_filtering_service.py, base_arango_service.py)
│  └─ Use: Optimized Rebuild (5-8 min)
│
├─ Both Frontend and Backend
│  └─ Use: Optimized Rebuild (5-8 min)
│
├─ Dependencies (pyproject.toml, package.json)
│  └─ Use: Full Clean Rebuild (15-20 min)
│
└─ Unsure / Errors
   └─ Use: Full Clean Rebuild (15-20 min)
```

---

## ⚡ Pro Tips

### Tip 1: Save as PowerShell function
```powershell
# Add to your PowerShell profile ($PROFILE)
function Rebuild-PipeshubAI {
    $env:DOCKER_BUILDKIT = 1
    $buildId = Get-Date -Format "yyyyMMdd-HHmmss-fff"
    docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai down
    docker compose -f deployment/docker-compose/docker-compose.dev.yml build --build-arg FRONTEND_BUILD_ID=$buildId pipeshub-ai
    docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai up -d
    docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai
}

# Then just run:
Rebuild-PipeshubAI
```

### Tip 2: Monitor build progress
```powershell
$env:DOCKER_BUILDKIT = 1
docker compose -f deployment/docker-compose/docker-compose.dev.yml build --progress=plain pipeshub-ai
```

### Tip 3: Check what changed
```powershell
git status
git diff backend/python/app/modules/retrieval/retrieval_service.py
```

### Tip 4: Quick health check
```powershell
# Check if services are running
docker compose -f deployment/docker-compose/docker-compose.dev.yml -p pipeshub-ai ps

# Check if frontend is accessible
curl http://localhost:3000

# Check if backend is accessible
curl http://localhost:8000/health
```

---

## 🔍 Troubleshooting Commands

### If build fails
```powershell
# Check Docker daemon
docker ps

# Check disk space
docker system df

# Clean up unused resources
docker system prune -a

# Try full rebuild
docker compose -f deployment/docker-compose/docker-compose.dev.yml build --no-cache pipeshub-ai
```

### If services won't start
```powershell
# Check logs
docker compose -f deployment/docker-compose/docker-compose.dev.yml logs pipeshub-ai

# Check specific service
docker compose -f deployment/docker-compose/docker-compose.dev.yml logs pipeshub-ai | tail -50

# Restart services
docker compose -f deployment/docker-compose/docker-compose.dev.yml down
docker compose -f deployment/docker-compose/docker-compose.dev.yml up -d
```

### If KB filtering not working
```powershell
# Check for filter parsing in logs
docker compose -f deployment/docker-compose/docker-compose.dev.yml logs pipeshub-ai | grep -i "filter"

# Check for validation messages
docker compose -f deployment/docker-compose/docker-compose.dev.yml logs pipeshub-ai | grep -i "validation"

# Check for errors
docker compose -f deployment/docker-compose/docker-compose.dev.yml logs pipeshub-ai | grep -i "error"
```

---

## 📊 Expected Output

### Successful build
```
[+] Building 5.2s (45/45) FINISHED
 => [base] ...
 => [python-deps] CACHED
 => [nodejs-backend] CACHED
 => [frontend-build] ...
 => [runtime] ...
[+] Running 1/1
 ✔ Container pipeshub-ai-pipeshub-ai-1  Started
```

### Successful startup
```
[+] Running 1/1
 ✔ Container pipeshub-ai-pipeshub-ai-1  Started
pipeshub-ai-pipeshub-ai-1  | [2024-01-15 10:30:45] === Process Monitor Starting ===
pipeshub-ai-pipeshub-ai-1  | [2024-01-15 10:30:45] Starting Node.js service...
pipeshub-ai-pipeshub-ai-1  | [2024-01-15 10:30:46] Node.js started with PID: 45
pipeshub-ai-pipeshub-ai-1  | [2024-01-15 10:30:46] Starting Connector service...
```

---

## ✅ Verification Checklist

After rebuild:

- [ ] Services started successfully
- [ ] No errors in logs
- [ ] Frontend accessible at http://localhost:3000
- [ ] Backend accessible at http://localhost:8000
- [ ] KB filtering selector visible in chat interface
- [ ] Can select KB/folder/file
- [ ] Can send message with filters
- [ ] Logs show filter parsing: `"Filters: kb_ids=X, folder_ids=Y, file_ids=Z"`

---

## 🎯 Quick Reference

| Task | Command | Time |
|------|---------|------|
| Optimized rebuild | See "Recommended" section | 5-8 min |
| Frontend only | See "Frontend Only" section | 2-3 min |
| Full clean | See "Full Clean" section | 15-20 min |
| Stop services | `docker compose ... down` | <1 min |
| View logs | `docker compose ... logs -f` | - |
| Check status | `docker compose ... ps` | <1 min |

---

**Ready to deploy? Start with the "Recommended" command above!** 🚀
