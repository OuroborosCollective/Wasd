# VPS Deployment Verification Tool

## Purpose

Quick verification script to check VPS deployment status after a CI/CD deploy.

## Usage

```bash
# Run verification
python3 scripts/vps-verify-deploy.py

# Or inline with paramiko
python3 << 'PYEOF'
import paramiko

VPS = {"host": "<VPS_HOST>", "port": 22, "user": "<SSH_USER>", "pass": "<SSH_PASSWORD>"}
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(**VPS, timeout=30)

# ... verification commands ...
client.close()
PYEOF
```

> **Note**: Replace `<VPS_HOST>`, `<SSH_USER>`, `<SSH_PASSWORD>` with your actual VPS credentials.

## Full Verification Script

Create at `scripts/vps-verify-deploy.py`:

```python
#!/usr/bin/env python3
"""
VPS Deployment Verification Tool
Usage: python3 scripts/vps-verify-deploy.py

Checks:
1. Container running
2. Git commit matches expected
3. Cozy-spring assets present
4. HTTPS endpoint accessible

IMPORTANT: Set credentials via environment variables or command line.
Do NOT hardcode passwords in the script.
"""

import paramiko
import os
import sys

# Configuration - load from environment or use placeholders
VPS_HOST = os.environ.get("VPS_HOST", "<VPS_HOST>")
VPS_PORT = int(os.environ.get("VPS_PORT", "22"))
VPS_USER = os.environ.get("VPS_USER", "<SSH_USER>")
VPS_PASS = os.environ.get("VPS_PASS", "<SSH_PASSWORD>")  # Set via env var, never hardcode
CONTAINER = os.environ.get("VPS_CONTAINER", "arelorian-engine")
EXPECTED_COMMIT = os.environ.get("VPS_EXPECTED_COMMIT", "5de9f541b6c36f0c1c38fb31677c1ce68bbebd12")
CHECK_ASSETS = [
    "/app/server/client/dist/2d/assets/cozy-spring/manifest.index.json",
    "/app/server/client/dist/2d/assets/biomes",
]

def check(client, cmd, expected_in_output):
    stdin, stdout, stderr = client.exec_command(cmd)
    output = stdout.read().decode().strip()
    return expected_in_output in output, output

def main():
    # Validate credentials
    if VPS_PASS == "<SSH_PASSWORD>" or not VPS_PASS:
        print("Error: VPS_PASS environment variable not set")
        print("Usage: VPS_PASS=your_password python3 scripts/vps-verify-deploy.py")
        sys.exit(1)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    print("Connecting to VPS...")
    try:
        client.connect(VPS_HOST, VPS_PORT, VPS_USER, VPS_PASS, timeout=30)
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)
    
    print("=" * 60)
    print("VPS DEPLOYMENT VERIFICATION")
    print("=" * 60)
    
    all_ok = True
    
    # 1. Container status
    ok, res = check(client, 
        f'docker ps --filter name={CONTAINER} --format "{{{{.Status}}}}"',
        "Up")
    status = "✅" if ok else "❌"
    print(f"{status} Container '{CONTAINER}': {res}")
    all_ok &= ok
    
    # 2. Git commit
    ok, res = check(client,
        'cd /opt/areloria && git log -1 --format="%H"',
        EXPECTED_COMMIT[:12])
    status = "✅" if ok else "❌"
    print(f"{status} Git commit: {res[:40]}")
    all_ok &= ok
    
    # 3. Asset files
    for asset in CHECK_ASSETS:
        ok, res = check(client,
            f'docker exec {CONTAINER} sh -c "test -f {asset} && echo FOUND || echo MISSING"',
            "FOUND")
        status = "✅" if ok else "❌"
        print(f"{status} Asset: {asset.split('/')[-1]}")
        all_ok &= ok
    
    # 4. HTTPS endpoint
    ok, res = check(client,
        'curl -s -I https://arelorian.de/health 2>&1 | head -1',
        "200")
    status = "✅" if ok else "❌"
    print(f"{status} HTTPS health: {res}")
    all_ok &= ok
    
    client.close()
    
    print("=" * 60)
    if all_ok:
        print("✅ ALL CHECKS PASSED")
        print("=" * 60)
        sys.exit(0)
    else:
        print("❌ SOME CHECKS FAILED")
        print("=" * 60)
        sys.exit(1)

if __name__ == "__main__":
    main()
```

## Quick One-Liners

```bash
# Check if container is running
docker exec arelorian-engine sh -c "echo OK" | head -1

# Check cozy-spring manifest
curl -s -I https://arelorian.de/2d/assets/cozy-spring/manifest.index.json | head -1

# Check git commit
cd /opt/areloria && git log -1 --format="%H %s"

# List container assets
docker exec arelorian-engine sh -c "ls -la /app/server/client/dist/2d/assets/"
```

## Docker Container Discovery

When unsure about container name:

```bash
docker ps --format "{{.Names}}\t{{.Status}}"
# Output: arelorian-engine    Up About an hour (healthy)
#         monitor-bridge      Up About an hour (healthy)
#         redis-comn-redis-1   Up 25 hours
```

## Related

- [VPS SSH Paramiko Patterns](../ai-skills/vps-ssh-paramiko-patterns.md)
- [Dockerfile.vps Public Assets Fix](../ai-skills/vite-public-assets-docker-fix.md)