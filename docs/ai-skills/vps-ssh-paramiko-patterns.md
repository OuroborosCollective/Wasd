# VPS SSH Access via Paramiko - Best Practices

## Overview

Using Python's `paramiko` library to manage VPS operations via SSH is a reliable way to automate deployment verification, container inspection, and server diagnostics.

## Installation

```bash
pip install paramiko
```

## Basic Connection Pattern

```python
import paramiko

def connect_vps(host, port, username, password, timeout=30):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=host,
        port=port,
        username=username,
        password=password,
        timeout=timeout
    )
    return client

# Usage
# Replace with your actual VPS credentials from environment variables
client = connect_vps("<VPS_HOST>", 22, "<SSH_USER>", os.environ.get("VPS_PASS", ""))
# ... commands ...
client.close()
```

> **Security Note**: Never hardcode credentials. Use environment variables (`VPS_HOST`, `VPS_USER`, `VPS_PASS`).

## Common Operations

### Docker Container Commands

⚠️ **Important**: Use `docker exec <container> sh -c "..."` instead of `docker exec -it <container> sh -lc ...` via SSH, as `-it` requires a TTY.

```python
# Check if file exists in container
stdin, stdout, stderr = client.exec_command(
    'docker exec arelorian-engine sh -c "test -f /path/to/file && echo OK || echo MISSING"'
)

# List directory in container
stdin, stdout, stderr = client.exec_command(
    'docker exec arelorian-engine sh -c "ls -la /app/server/client/dist/2d/"'
)

# Get container status
stdin, stdout, stderr = client.exec_command(
    'docker ps --filter name=arelorian-engine --format "{{.Names}}\t{{.Status}}"'
)
```

### Git Operations on VPS

```python
# Check current commit
stdin, stdout, stderr = client.exec_command(
    'cd /opt/areloria && git log -1 --format="%H %s"'
)

# Check branch status
stdin, stdout, stderr = client.exec_command(
    'cd /opt/areloria && git branch -v'
)
```

### HTTPS Endpoint Verification

```python
# Check HTTP status from VPS
stdin, stdout, stderr = client.exec_command(
    'curl -s -I https://arelorian.de/2d/assets/cozy-spring/manifest.index.json'
)
```

## Verification Checklist

When deploying a fix to VPS, verify:

1. **Container running**: `docker ps --filter name=<container-name>`
2. **Git commit matches**: `git log -1 --format="%H"`
3. **Assets present**: `test -f /path/to/asset && echo FOUND || echo MISSING`
4. **HTTPS accessible**: `curl -I https://domain.com/path`
5. **Build timestamp**: `docker inspect <container> --format "{{.Created}}"`

## Error Handling

```python
try:
    client.connect(hostname, port, username, password, timeout=30)
except paramiko.AuthenticationException:
    print("Authentication failed - check credentials")
except paramiko.SSHException as e:
    print(f"SSH error: {e}")
except socket.timeout:
    print("Connection timed out")
```

## VPS Deployment Fix Template

```python
#!/usr/bin/env python3
"""VPS deployment verification script

IMPORTANT: Load credentials from environment variables, never hardcode.
"""
import paramiko
import os
import sys

VPS_HOST = os.environ.get("VPS_HOST", "<VPS_HOST>")
VPS_PORT = 22
VPS_USER = os.environ.get("VPS_USER", "<SSH_USER>")
VPS_PASS = os.environ.get("VPS_PASS", "")  # Set via env var
CONTAINER = os.environ.get("VPS_CONTAINER", "arelorian-engine")

# Validate credentials
if not VPS_HOST or not VPS_USER or not VPS_PASS:
    print("Error: VPS_HOST, VPS_USER, VPS_PASS environment variables required")
    sys.exit(1)

def exec_check(client, command, expected):
    stdin, stdout, stderr = client.exec_command(command)
    result = stdout.read().decode().strip()
    if expected in result:
        return True, result
    return False, result

def main():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(VPS_HOST, VPS_PORT, VPS_USER, VPS_PASS, timeout=30)
    
    # Check 1: Container running
    ok, res = exec_check(client, 
        f'docker ps --filter name={CONTAINER} --format "{{{{.Status}}}}"', 
        "Up")
    
    client.close()
    
    if ok:
        print(f"✅ {CONTAINER} is running")
    else:
        print(f"❌ Container check failed: {res}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## Key Learnings

1. **Container naming**: Not always `areloria` - check with `docker ps` for actual name
2. **TTY issues**: Never use `-it` flag via SSH, use `sh -c` instead
3. **Path structure**: Inside container, client assets are at `/app/server/client/dist/`
4. **Health checks**: Combine container status + git commit + asset file existence

## Related

- [VPS Docker Deploy Workflow](./wasd-github-actions-repair.md)
- [Client-2D Best Practices](./wasd-client-2d-best-practices.md)