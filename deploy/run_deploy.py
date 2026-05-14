#!/usr/bin/env python3
"""
Run remote commands on the Areloria VPS using Paramiko.

Do not put passwords or keys in this file. Set environment variables instead:

  SSH_HOST        VPS hostname or IP (required)
  SSH_USER        SSH user (default: root)
  SSH_PASSWORD    password auth (optional if SSH_PRIVATE_KEY is set)
  SSH_PRIVATE_KEY  PEM text or path to key file (optional)
  SSH_PORT        port (default: 22)
  REMOTE_APP_DIR  app path on server (default: /opt/areloria)
  GIT_REMOTE_BRANCH branch to sync (default: main)
  GIT_REPO_URL    clone URL when app dir has no .git (optional)

Install once:

  pip install -r deploy/requirements-ssh.txt

Examples:

  SSH_HOST=1.2.3.4 SSH_PASSWORD='...' python3 deploy/run_deploy.py sync
  SSH_HOST=1.2.3.4 SSH_PRIVATE_KEY=~/.ssh/id_ed25519 python3 deploy/run_deploy.py run "pm2 status"
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from paramiko import SSHClient

DEFAULT_APP_DIR = "/opt/areloria"
DEFAULT_BRANCH = "main"
DEFAULT_REPO = "https://github.com/OuroborosCollective/Wasd.git"


def _require_paramiko():
    try:
        import paramiko  # noqa: WPS433 — runtime optional dependency
    except ImportError as exc:
        print(
            "Paramiko is not installed. Run: pip install -r deploy/requirements-ssh.txt",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc
    return paramiko


def _load_private_key(paramiko, key_material: str):
    """Try common key parsers for PEM or path."""
    path = Path(os.path.expanduser(key_material))
    if path.is_file():
        key_material = path.read_text(encoding="utf-8", errors="replace")
    for loader in (
        paramiko.RSAKey.from_private_key,
        paramiko.Ed25519Key.from_private_key,
        paramiko.ECDSAKey.from_private_key,
    ):
        try:
            from io import StringIO

            return loader(StringIO(key_material))
        except Exception:
            continue
    print("Could not parse SSH_PRIVATE_KEY as RSA, Ed25519, or ECDSA PEM.", file=sys.stderr)
    raise SystemExit(1)


def connect(paramiko) -> "SSHClient":
    host = os.environ.get("SSH_HOST", "").strip()
    if not host:
        print("SSH_HOST is required.", file=sys.stderr)
        raise SystemExit(1)

    user = os.environ.get("SSH_USER", "root").strip()
    port = int(os.environ.get("SSH_PORT", "22"))
    password = os.environ.get("SSH_PASSWORD")
    pkey_raw = os.environ.get("SSH_PRIVATE_KEY")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    connect_kw: dict = {
        "hostname": host,
        "port": port,
        "username": user,
        "timeout": 60,
        "banner_timeout": 60,
        "auth_timeout": 60,
    }
    if pkey_raw:
        connect_kw["pkey"] = _load_private_key(paramiko, pkey_raw)
    if password:
        connect_kw["password"] = password
    if not pkey_raw and not password:
        print("Set SSH_PASSWORD and/or SSH_PRIVATE_KEY for authentication.", file=sys.stderr)
        raise SystemExit(1)

    try:
        client.connect(**connect_kw)
    except paramiko.AuthenticationException:
        print("SSH authentication failed (check SSH_USER / SSH_PASSWORD / SSH_PRIVATE_KEY).", file=sys.stderr)
        raise SystemExit(1) from None
    return client


def stream_exec(client: "SSHClient", command: str) -> int:
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    assert stdin
    channels = (stdout.channel, stderr.channel)
    while not stdout.channel.exit_status_ready():
        for ch in channels:
            if ch.recv_ready():
                sys.stdout.buffer.write(ch.recv(4096))
                sys.stdout.flush()
        if stdout.channel.exit_status_ready():
            break
    # Drain remainder
    for ch in channels:
        while ch.recv_ready():
            sys.stdout.buffer.write(ch.recv(4096))
            sys.stdout.flush()
    return int(stdout.channel.recv_exit_status())


def remote_sync_script(app_dir: str, branch: str, repo: str) -> str:
    app_q = app_dir.replace("'", "'\"'\"'")
    branch_q = branch.replace("'", "'\"'\"'")
    repo_q = repo.replace("'", "'\"'\"'")
    return f"""set -euo pipefail
APP_DIR='{app_q}'
BRANCH='{branch_q}'
REPO='{repo_q}'
mkdir -p "$APP_DIR"
cd "$APP_DIR"
if [ ! -d .git ]; then
  git clone "$REPO" .
fi
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"
bash deploy/update.sh
"""


def cmd_sync(client: "SSHClient") -> int:
    app_dir = os.environ.get("REMOTE_APP_DIR", DEFAULT_APP_DIR).strip()
    branch = os.environ.get("GIT_REMOTE_BRANCH", DEFAULT_BRANCH).strip()
    repo = os.environ.get("GIT_REPO_URL", DEFAULT_REPO).strip()
    return stream_exec(client, remote_sync_script(app_dir, branch, repo))


def main() -> int:
    paramiko = _require_paramiko()

    parser = argparse.ArgumentParser(description="Paramiko SSH helper for VPS deploy.")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("sync", help="git reset to origin branch + bash deploy/update.sh on REMOTE_APP_DIR")
    run_p = sub.add_parser("run", help="Run a single remote shell command string")
    run_p.add_argument("remote_command", help="e.g. 'pm2 status' or 'curl -s http://127.0.0.1:3000/health'")

    args = parser.parse_args()
    client = connect(paramiko)
    try:
        if args.cmd == "sync":
            return cmd_sync(client)
        if args.cmd == "run":
            return stream_exec(client, args.remote_command)
    finally:
        client.close()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
