#!/usr/bin/env python3
"""
VPS Deployment Verification Tool

Usage:
    python3 tools/vps/vps-verify.py [--container NAME] [--host HOST] [--user USER] [--pass PASS]

Credentials:
    Set via environment variables VPS_HOST, VPS_USER, VPS_PASS or via command line.
    NEVER hardcode passwords in the script.

Examples:
    # With environment variables
    VPS_HOST=<VPS_HOST> VPS_USER=<SSH_USER> VPS_PASS=<PASSWORD> python3 tools/vps/vps-verify.py

    # With command line
    python3 tools/vps/vps-verify.py --host <VPS_HOST> --user <SSH_USER> --pass <PASSWORD>

    # With defaults from environment
    python3 tools/vps/vps-verify.py --container arelorian-engine
"""

import argparse
import os
import sys
from typing import Optional

try:
    import paramiko
except ImportError:
    print("Error: paramiko not installed. Run: pip install paramiko")
    sys.exit(1)


def parse_args():
    parser = argparse.ArgumentParser(description="VPS Deployment Verification Tool")
    parser.add_argument("--host", default=os.environ.get("VPS_HOST", ""), 
                        help="VPS hostname (or set VPS_HOST env var)")
    parser.add_argument("--port", type=int, default=22, help="SSH port")
    parser.add_argument("--user", default=os.environ.get("VPS_USER", ""),
                        help="SSH username (or set VPS_USER env var)")
    parser.add_argument("--pass", dest="password", 
                        help="SSH password (or set VPS_PASS env var)")
    parser.add_argument("--container", default="arelorian-engine", help="Docker container name")
    parser.add_argument("--expected-commit", default=None, help="Expected git commit hash (first 12 chars)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    return parser.parse_args()


def run_check(client, cmd: str, expected_in: str) -> tuple[bool, str]:
    """Run a command and check if expected string is in output."""
    stdin, stdout, stderr = client.exec_command(cmd)
    output = stdout.read().decode().strip()
    return expected_in in output, output


def main():
    args = parse_args()
    
    # Load from environment if not provided via args
    args.host = args.host or os.environ.get("VPS_HOST", "")
    args.user = args.user or os.environ.get("VPS_USER", "")
    args.password = args.password or os.environ.get("VPS_PASS", "")
    
    # Validate required credentials
    if not args.host:
        print("Error: VPS hostname required. Use --host or set VPS_HOST env var.")
        sys.exit(1)
    if not args.user:
        print("Error: SSH username required. Use --user or set VPS_USER env var.")
        sys.exit(1)
    if not args.password:
        print("Error: SSH password required. Use --pass or set VPS_PASS env var.")
        print("Usage: VPS_PASS=your_password python3 tools/vps/vps-verify.py")
        sys.exit(1)
    
    print(f"Connecting to {args.user}@{args.host}:{args.port}...")
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        client.connect(
            args.host, args.port, args.user, args.password, 
            timeout=30, 
            banner_timeout=30
        )
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)
    
    print("=" * 60)
    print("VPS DEPLOYMENT VERIFICATION")
    print("=" * 60)
    print(f"Container: {args.container}")
    print()
    
    all_ok = True
    
    # 1. Container status
    ok, res = run_check(
        client,
        f'docker ps --filter name={args.container} --format "{{{{.Status}}}}"',
        "Up"
    )
    print(f"{'✅' if ok else '❌'} Container '{args.container}': {res or 'NOT FOUND'}")
    all_ok &= ok
    
    # 2. Git commit (if expected provided)
    if args.expected_commit:
        ok, res = run_check(
            client,
            'cd /opt/areloria && git log -1 --format="%H"',
            args.expected_commit[:12]
        )
        print(f"{'✅' if ok else '❌'} Git commit: {res[:40] if res else 'N/A'}")
        all_ok &= ok
    
    # 3. Client dist exists
    ok, res = run_check(
        client,
        f'docker exec {args.container} sh -c "test -d /app/server/client/dist && echo OK || echo MISSING"',
        "OK"
    )
    print(f"{'✅' if ok else '❌'} Client dist: {'Found' if ok else 'Missing'}")
    all_ok &= ok
    
    # 4. Cozy-spring manifest
    ok, res = run_check(
        client,
        f'docker exec {args.container} sh -c "test -f /app/server/client/dist/2d/assets/cozy-spring/manifest.index.json && echo FOUND || echo MISSING"',
        "FOUND"
    )
    print(f"{'✅' if ok else '❌'} Cozy-spring manifest: {res}")
    all_ok &= ok
    
    # 5. 2d index.html
    ok, res = run_check(
        client,
        f'docker exec {args.container} sh -c "test -f /app/server/client/dist/2d/index.html && echo FOUND || echo MISSING"',
        "FOUND"
    )
    print(f"{'✅' if ok else '❌'} 2D client index.html: {res}")
    all_ok &= ok
    
    # 6. HTTPS health
    ok, res = run_check(
        client,
        'curl -s -I https://arelorian.de/health 2>&1 | head -1',
        "200"
    )
    print(f"{'✅' if ok else '❌'} HTTPS health endpoint: {res or 'FAILED'}")
    all_ok &= ok
    
    # 7. HTTPS cozy-spring
    ok, res = run_check(
        client,
        'curl -s -I https://arelorian.de/2d/assets/cozy-spring/manifest.index.json 2>&1 | head -1',
        "200"
    )
    print(f"{'✅' if ok else '❌'} HTTPS cozy-spring manifest: {res or 'FAILED'}")
    all_ok &= ok
    
    # 8. Image build time
    stdin, stdout, stderr = client.exec_command(
        f'docker inspect {args.container} --format "{{{{.Created}}}}"'
    )
    build_time = stdout.read().decode().strip()
    print(f"\n📅 Image built: {build_time}")
    
    if args.verbose:
        # List all containers
        stdin, stdout, stderr = client.exec_command(
            'docker ps --format "{{.Names}}\t{{.Status}}"'
        )
        print("\n📦 All containers:")
        print(stdout.read().decode().strip())
    
    client.close()
    
    print()
    print("=" * 60)
    if all_ok:
        print("✅ ALL CHECKS PASSED")
    else:
        print("❌ SOME CHECKS FAILED")
    print("=" * 60)
    
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()