# Performance Optimization for 8-Core, 64GB System

## System Configuration
- **CPU**: 8 cores, 16 threads
- **RAM**: 64GB
- **Allocation**: 7 cores, 48GB to Docker/WSL2

## Changes Made

### 1. Docker Compose Optimization (`docker-compose.dev.yml`)

**Main Container (pipeshub-ai)**:
- CPU Limit: 7 cores (leave 1 for system)
- CPU Reservation: 6 cores (guaranteed)
- Memory Limit: 32GB
- Memory Reservation: 24GB
- Shared Memory: 8GB (for document processing)

**Qdrant Vector Database**:
- CPU Limit: 4 cores
- Memory Limit: 4GB
- Optimized for vector search operations

### 2. WSL2 Configuration (`.wslconfig`)

Create this file at: `C:\Users\<YourUsername>\.wslconfig`

```ini
[wsl2]
processors=7
memory=48GB
swap=4GB
localhostForwarding=true
pageReporting=true
sparseVhd=true
interopEnabled=true
appendWindowsPath=true
systemd=true
```

## Setup Instructions

### Step 1: Copy WSL2 Config
```powershell
# Copy the .wslconfig file from the project to your home directory
Copy-Item ".\.wslconfig" "$env:USERPROFILE\.wslconfig"
```

Or manually:
1. Open `C:\Users\<YourUsername>\.wslconfig` in Notepad
2. Paste the content from the `.wslconfig` file in this project
3. Save and close

### Step 2: Restart WSL2
```powershell
# Terminate WSL2 to apply new settings
wsl --shutdown

# Verify settings were applied
wsl -l -v
```

### Step 3: Restart Docker Desktop
1. Close Docker Desktop completely
2. Wait 10 seconds
3. Reopen Docker Desktop
4. Wait for it to fully start (check system tray)

### Step 4: Rebuild and Test
```bash
cd deployment/docker-compose

# Stop current containers
docker compose -f docker-compose.dev.yml -p pipeshub-ai down

# Remove old image to force rebuild
docker rmi pipeshub-ai:latest

# Rebuild with new configuration
docker compose -f docker-compose.dev.yml -p pipeshub-ai up --build -d

# Monitor startup
docker compose -f docker-compose.dev.yml -p pipeshub-ai logs -f pipeshub-ai
```

## Expected Performance Improvements

### Document Upload
- **Before**: ~6 minutes
- **After**: ~1-2 minutes (5-6x faster)

### Vector Search
- **Before**: Slow due to CPU throttling
- **After**: Near-native performance

### Overall System
- **Responsiveness**: Significantly improved
- **Concurrent Operations**: Can handle multiple uploads simultaneously
- **Memory Efficiency**: Better caching and buffer management

## Resource Allocation Summary

| Component | CPUs | Memory | Purpose |
|-----------|------|--------|---------|
| pipeshub-ai (main) | 7 (limit) / 6 (reserved) | 32GB (limit) / 24GB (reserved) | All services |
| Qdrant | 4 | 4GB | Vector search |
| MongoDB | Shared | Shared | Document storage |
| Redis | Shared | Shared | Caching |
| Kafka | Shared | Shared | Event streaming |
| System (Windows) | 1 | 16GB | OS operations |

## Monitoring

Check resource usage:
```bash
# View container stats
docker stats pipeshub-ai

# View WSL2 memory usage
wsl --list --verbose

# Check Docker Desktop resource allocation
# Settings → Resources → see current usage
```

## Troubleshooting

### If Docker is still slow:
1. Verify `.wslconfig` was applied: `wsl --shutdown` then check again
2. Check Docker Desktop settings match the compose file
3. Ensure no other heavy applications are running
4. Check disk space: `docker system df`

### If you get "out of memory" errors:
1. Reduce `memory` in `.wslconfig` to 40GB
2. Reduce `pipeshub-ai` memory limit to 24GB
3. Check for memory leaks: `docker stats`

### If you get "too many open files":
The `ulimits` in docker-compose are already optimized. If issues persist:
```bash
# Increase system limits
docker exec pipeshub-ai-pipeshub-ai-1 ulimit -n 65536
```

## Notes

- These settings are optimized for development/testing
- For production, consider using Kubernetes instead of Docker Compose
- The 8GB shared memory is important for PDF/OCR processing
- Swap is used as overflow, not primary memory
