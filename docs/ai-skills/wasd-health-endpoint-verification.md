# Health Endpoint Verification

## Overview

Patterns for verifying health endpoints on VPS, including quest persistence health checks.

## Health Endpoints

| Endpoint | Description | Port |
|----------|-------------|------|
| `/health` | General server health | 3001 |
| `/health/quest-persistence` | Quest persistence specific | 3001 |
| `/health/player-stats` | Player stats persistence | 3001 |

## Quick Verification

```bash
# Basic health
curl -s http://localhost:3001/health

# Quest persistence health
curl -s http://localhost:3001/health/quest-persistence

# Via domain (through traefik)
curl -s https://arelorian.de/health
```

## Expected Responses

### /health

```json
{
  "ok": true,
  "status": "ok",
  "project": "ARELORIAN MMORPG",
  "version": "0.2.0",
  "uptimeSeconds": 33,
  "port": 3001,
  "persistence": {
    "totalSaves": 0,
    "totalLoads": 0,
    "queueFlushes": 0,
    "priorityFlushes": 0
  }
}
```

### /health/quest-persistence

```json
{
  "ok": true,
  "persistence": {
    "ok": true,
    "filePath": "/app/data/quest-state.json",
    "dir": "/app/data",
    "writable": true
  }
}
```

**Error state** (not writable):
```json
{
  "ok": false,
  "persistence": {
    "ok": false,
    "filePath": "/app/data/quest-state.json",
    "dir": "/app/data",
    "writable": false,
    "error": "EACCES: permission denied, open '/app/data/.quest-write-test'"
  }
}
```

## Python Verification Script

```python
import paramiko
import json

host = '46.202.154.25'
port = 22
username = 'root'
password = '2N00py123+++'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=username, password=password, timeout=10)

def run_cmd(client, cmd):
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    exit_code = stdout.channel.recv_exit_status()
    return stdout.read().decode().strip(), stderr.read().decode().strip(), exit_code

def check_health():
    out, err, code = run_cmd(client, "curl -s http://localhost:3001/health")
    if out:
        data = json.loads(out)
        print(f"Status: {data.get('status')}")
        print(f"OK: {data.get('ok')}")
        print(f"Version: {data.get('version')}")
        
        # Check persistence
        persist = data.get('persistence', {})
        print(f"Total Saves: {persist.get('totalSaves')}")
        
    return out

def check_quest_health():
    out, err, code = run_cmd(client, "curl -s http://localhost:3001/health/quest-persistence")
    if out:
        data = json.loads(out)
        print(f"Quest OK: {data.get('ok')}")
        
        persist = data.get('persistence', {})
        print(f"Writable: {persist.get('writable')}")
        print(f"File Path: {persist.get('filePath')}")
        
        if not persist.get('writable'):
            print(f"Error: {persist.get('error')}")
    
    return out

check_health()
check_quest_health()

client.close()
```

## Bash Verification Script

```bash
#!/usr/bin/env bash
set -euo pipefail

echo "=== Health Check ==="

# Check main health
HEALTH=$(curl -s --max-time 10 http://localhost:3001/health)
echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"

# Check quest persistence
QUEST_HEALTH=$(curl -s --max-time 10 http://localhost:3001/health/quest-persistence)
echo ""
echo "=== Quest Persistence Health ==="
echo "$QUEST_HEALTH" | python3 -m json.tool 2>/dev/null || echo "$QUEST_HEALTH"

# Verify writable
if echo "$QUEST_HEALTH" | grep -q '"writable": true'; then
    echo ""
    echo "✅ Quest persistence is writable"
else
    echo ""
    echo "❌ Quest persistence NOT writable"
    exit 1
fi
```

## Common Issues

### Connection Refused

```
curl: (7) Failed to connect to localhost port 3001
```

**Cause**: Server not running or wrong port.

**Fix**:
```bash
# Check if server is listening
docker exec arelorian-engine sh -lc 'netstat -tlnp | grep 300'

# Or
docker exec arelorian-engine sh -lc 'ss -tlnp | grep 300'

# Check container status
docker ps --filter 'name=arelorian'
```

### 502 Bad Gateway

```
<html>
<head><title>502 Bad Gateway</title></head>
...
```

**Cause**: Traefik can't reach container.

**Fix**:
```bash
# Check container is running
docker ps

# Check container can respond locally
curl -s http://localhost:3001/health

# Restart container
docker restart arelorian-engine
```

### Timeout

```
curl: (28) Operation timed out after 10010 milliseconds
```

**Fix**:
```bash
# Use shorter timeout
curl -s --max-time 5 http://localhost:3001/health

# Check container logs
docker logs --tail 20 arelorian-engine
```

## Environment Variables for Health

The health endpoint reflects these environment variables:

| Variable | Default | Affects |
|----------|---------|---------|
| `QUEST_PERSISTENCE_DRIVER` | `json` | Quest adapter selection |
| `QUEST_STATE_FILE` | `/app/data/quest-state.json` | File path in health response |
| `DATABASE_URL` | (none) | Postgres adapter availability |

## Container Health Check

docker-compose includes a healthcheck:

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3001/health').then(r => (r.ok || r.status === 503) ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]
  interval: 15s
  timeout: 10s
  retries: 20
  start_period: 180s
```

## Verification in CI

```bash
# Wait for health endpoint
for i in {1..30}; do
    if curl -s http://localhost:3001/health | grep -q '"status":"ok"'; then
        echo "Server is healthy"
        exit 0
    fi
    echo "Waiting for server... ($i)"
    sleep 2
done

echo "Server health check failed"
exit 1
```

## Related Skills

- `wasd-quest-persistence-ops.md` - Quest persistence health
- `wasd-vps-paramiko-ssh.md` - VPS health checks via SSH
- `vps-deploy-verification-tool.md` - VPS verification patterns