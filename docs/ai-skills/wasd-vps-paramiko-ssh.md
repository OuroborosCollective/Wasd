# VPS SSH with Paramiko

## Overview

Patterns for SSH connections to VPS using Python paramiko. Used for production operations, deployment, and verification.

## Quick Start

```python
import paramiko

def run_cmd(client, cmd, desc=""):
    """Run SSH command and return output."""
    if desc:
        print(f"[vps] {desc}...")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    exit_code = stdout.channel.recv_exit_status()
    output = stdout.read().decode().strip()
    error = stderr.read().decode().strip()
    return output, error, exit_code

# Connect
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=22, username='root', password='password', timeout=10)

# Run commands
out, err, code = run_cmd(client, "docker ps", "List containers")
print(out)

client.close()
```

## VPS Connection Details

| VPS | IP | User | Notes |
|-----|-----|------|-------|
| Production | 46.202.154.25 | root | Areloria game server |

## Common Patterns

### Multi-Command Execution

```python
import paramiko
import time

host = '46.202.154.25'
port = 22
username = 'root'
password = '2N00py123+++'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=username, password=password, timeout=10)

def run_cmd(client, cmd, desc=""):
    if desc:
        print(f"\n[vps] {desc}...")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    exit_code = stdout.channel.recv_exit_status()
    output = stdout.read().decode().strip()
    error = stderr.read().decode().strip()
    return output, error, exit_code

# Example: Restart container and verify
out, err, code = run_cmd(client, "docker restart arelorian-engine", "Restart")
print(f"  restart: {out}")

time.sleep(30)

out, err, code = run_cmd(client, "curl -s http://localhost:3001/health", "Health check")
print(f"  health: {out}")

client.close()
```

### File Transfer with Base64

When file content contains special characters, use base64 encoding:

```python
# Write file to VPS
import base64

content = """services:
  arelorian-engine:
    environment:
      QUEST_PERSISTENCE_DRIVER: postgres
"""

encoded = base64.b64encode(content.encode()).decode()
run_cmd(client, f"echo '{encoded}' | base64 -d > /opt/areloria/docker-compose.yml", "Write file")
```

### Long-Running Commands

For docker-compose builds that take time:

```python
# Run with longer timeout
stdin, stdout, stderr = client.exec_command(cmd, timeout=300)

# Poll for completion
output = ""
while not stdout.channel.exit_status_ready():
    time.sleep(5)
    if stdout.channel.recv_ready():
        output += stdout.read().decode()

exit_code = stdout.channel.recv_exit_status()
```

### Handling Docker Compose Errors

docker-compose can fail with `KeyError: 'ContainerConfig'`. Workarounds:

```python
# Option 1: Use docker run directly
out, err, code = run_cmd(client, """
cd /opt/areloria && docker run -d \
  --name arelorian-engine \
  -e QUEST_PERSISTENCE_DRIVER=postgres \
  -e QUEST_STATE_FILE=/app/data/quest-state.json \
  areloria-arelorian-engine:latest
""", "Docker run")

# Option 2: Force recreate
out, err, code = run_cmd(client, "docker-compose up -d --force-recreate 2>&1", "Recreate")

# Option 3: Remove old container first
run_cmd(client, "docker rm -f arelorian-engine", "Remove old")
run_cmd(client, "docker-compose up -d 2>&1", "Start fresh")
```

## Container Management

```python
# Check container status
out, err, code = run_cmd(client, "docker ps --filter 'name=arelorian' --format '{{.Names}} {{.Status}}'", "Status")

# Get container name (may be prefixed with project)
out, err, code = run_cmd(client, "docker ps --filter 'name=arelorian' --format '{{.Names}}'", "Name")
container = out.strip()

# Check env in container
out, err, code = run_cmd(client, f"docker exec {container} sh -lc 'env | grep QUEST'", "Env")

# Check logs
out, err, code = run_cmd(client, f"docker logs --tail 50 {container} 2>&1", "Logs")

# Restart
run_cmd(client, "docker restart arelorian-engine", "Restart")
```

## Health Checks

```python
# Local health (inside container network)
out, err, code = run_cmd(client, "curl -s --max-time 10 http://localhost:3001/health", "Health")
print(f"  {out}")

# Quest persistence health
out, err, code = run_cmd(client, "curl -s http://localhost:3001/health/quest-persistence", "Quest health")
print(f"  {out}")

# Via domain (through traefik)
out, err, code = run_cmd(client, "curl -s --max-time 10 https://arelorian.de/health", "Health via domain")
```

## Cron Management

```python
# Add backup cron
cron_line = '*/30 * * * * cd /opt/areloria && APP_DIR=/opt/areloria scripts/backup-quest-state.sh >> /opt/areloria/logs/quest-backup.log 2>&1'
run_cmd(client, f"( crontab -l 2>/dev/null | grep -v 'backup-quest-state.sh' ; echo '{cron_line}' ) | crontab -", "Add cron")

# Verify cron
out, err, code = run_cmd(client, "crontab -l | grep backup-quest-state", "Verify cron")

# Remove cron
run_cmd(client, "crontab -l 2>/dev/null | grep -v 'backup-quest-state.sh' | crontab -", "Remove cron")
```

## Permissions

```python
# Fix permissions
run_cmd(client, "chmod 777 /opt/areloria/data", "Fix perms")

# Check permissions
out, err, code = run_cmd(client, "ls -la /opt/areloria/data/", "Check perms")
```

## Git Operations

```python
# Pull latest
out, err, code = run_cmd(client, "cd /opt/areloria && git fetch origin main", "Fetch")
out, err, code = run_cmd(client, "cd /opt/areloria && git reset --hard origin/main", "Reset")

# Check current commit
out, err, code = run_cmd(client, "cd /opt/areloria && git rev-parse --short HEAD", "Commit")
```

## Error Handling

```python
def run_cmd(client, cmd, desc=""):
    try:
        if desc:
            print(f"\n[vps] {desc}...")
        stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
        exit_code = stdout.channel.recv_exit_status()
        output = stdout.read().decode().strip()
        error = stderr.read().decode().strip()
        
        if exit_code != 0 and error:
            print(f"[vps] ERROR: {error}")
        
        return output, error, exit_code
    except Exception as e:
        print(f"[vps] EXCEPTION: {e}")
        return "", str(e), -1
```

## Installation

```bash
pip install paramiko
```

## Related Skills

- `wasd-vps-deployment-troubleshooting.md` - VPS deployment issues
- `wasd-quest-persistence-ops.md` - Quest persistence operations
- `vps-deployment-workflow-best-practices.md` - Deployment patterns