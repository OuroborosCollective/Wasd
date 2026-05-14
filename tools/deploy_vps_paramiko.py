#!/usr/bin/env python3
"""
Optional local deploy trigger using Paramiko (SSH).

Security:
  - Do NOT hardcode passwords. Prefer SSH keys.
  - If you must use a password, pass it only via env SSH_PASSWORD for one-off runs
    and rotate credentials afterwards.

Environment:
  VPS_HOST          required
  VPS_USER          required (e.g. root or deploy)
  VPS_DEPLOY_PATH   default /opt/areloria
  SSH_PRIVATE_KEY   PEM / OpenSSH private key contents (recommended)
  SSH_KEY_FILE      path to private key file (alternative to SSH_PRIVATE_KEY)
  SSH_PASSWORD      optional (discouraged)
  VPS_SSH_PORT      default 22

Usage:
  export VPS_HOST=your.server
  export VPS_USER=deploy
  export SSH_PRIVATE_KEY="$(cat ~/.ssh/id_ed25519)"
  export VPS_DEPLOY_PATH=/opt/areloria
  python3 tools/deploy_vps_paramiko.py
"""

from __future__ import annotations

import os
import shlex
import sys
from io import StringIO
from typing import Any


def _try_load_pkey(paramiko: Any, password: str | None) -> Any:
    key_data = os.environ.get("SSH_PRIVATE_KEY", "").strip()
    key_file = os.environ.get("SSH_KEY_FILE", "").strip()
    classes = (
        paramiko.Ed25519Key,
        paramiko.RSAKey,
        paramiko.ECDSAKey,
    )
    if key_file:
        for cls in classes:
            try:
                return cls.from_private_key_file(key_file, password=password)
            except Exception:
                continue
    if key_data:
        buf = StringIO(key_data)
        for cls in classes:
            try:
                buf.seek(0)
                return cls.from_private_key(buf, password=password)
            except Exception:
                continue
    return None


def main() -> int:
    try:
        import paramiko  # type: ignore
    except ImportError:
        print("Install paramiko:  pip install paramiko", file=sys.stderr)
        return 1

    host = os.environ.get("VPS_HOST", "").strip()
    user = os.environ.get("VPS_USER", "").strip()
    path = os.environ.get("VPS_DEPLOY_PATH", "/opt/areloria").strip()
    port = int(os.environ.get("VPS_SSH_PORT", "22"))

    if not host or not user:
        print("VPS_HOST and VPS_USER are required.", file=sys.stderr)
        return 1

    password = os.environ.get("SSH_PASSWORD")
    pkey = _try_load_pkey(paramiko, password)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        client.connect(
            hostname=host,
            port=port,
            username=user,
            pkey=pkey,
            password=password if pkey is None else None,
            look_for_keys=pkey is None and password is None,
            allow_agent=pkey is None and password is None,
            timeout=30,
        )
    except Exception as e:  # noqa: BLE001
        print(f"SSH connect failed: {e}", file=sys.stderr)
        return 1

    remote = f"set -euo pipefail; cd {shlex.quote(path)}; bash scripts/deploy-vps-docker.sh"
    _stdin, stdout, stderr = client.exec_command(remote, get_pty=True)
    out = stdout.read().decode(errors="replace")
    err = stderr.read().decode(errors="replace")
    code = stdout.channel.recv_exit_status()
    client.close()

    if out:
        sys.stdout.write(out)
    if err:
        sys.stderr.write(err)
    return 0 if code == 0 else code


if __name__ == "__main__":
    raise SystemExit(main())
