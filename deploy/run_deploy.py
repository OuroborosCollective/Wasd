#!/usr/bin/env python3
"""
Run remote commands on the Areloria VPS using Paramiko.

Credentials must come from the environment (never commit passwords or keys).

  ARELORIA_SSH_HOST          — required (e.g. your VPS IP or hostname)
  ARELORIA_SSH_USER          — optional, default root
  ARELORIA_SSH_PORT          — optional, default 22
  ARELORIA_SSH_PASSWORD      — optional if using a key
  ARELORIA_SSH_KEY_PATH      — optional path to private key file
  ARELORIA_SSH_KEY_PASSPHRASE — optional, if the key file is encrypted

Examples:

  export ARELORIA_SSH_HOST=your.vps.example
  export ARELORIA_SSH_KEY_PATH=$HOME/.ssh/id_ed25519
  python3 deploy/run_deploy.py update

  python3 deploy/run_deploy.py exec -- "cd /opt/areloria && git status"
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

try:
    import paramiko
except ImportError:
    print("Install Paramiko: pip install paramiko", file=sys.stderr)
    raise SystemExit(1)

DEFAULT_APP_DIR = "/opt/areloria"


def _connect() -> paramiko.SSHClient:
    host = os.environ.get("ARELORIA_SSH_HOST", "").strip()
    if not host:
        print("Set ARELORIA_SSH_HOST to your VPS hostname or IP.", file=sys.stderr)
        raise SystemExit(1)

    user = os.environ.get("ARELORIA_SSH_USER", "root").strip()
    port = int(os.environ.get("ARELORIA_SSH_PORT", "22"))
    password = os.environ.get("ARELORIA_SSH_PASSWORD")
    key_path_raw = os.environ.get("ARELORIA_SSH_KEY_PATH", "").strip()
    passphrase = os.environ.get("ARELORIA_SSH_KEY_PASSPHRASE")

    kwargs: dict = dict(
        hostname=host,
        port=port,
        username=user,
        timeout=60,
        banner_timeout=60,
        allow_agent=False,
        look_for_keys=False,
    )

    if key_path_raw:
        key_file = Path(key_path_raw).expanduser()
        if not key_file.is_file():
            print(f"ARELORIA_SSH_KEY_PATH is not a file: {key_file}", file=sys.stderr)
            raise SystemExit(1)
        kwargs["key_filename"] = [str(key_file)]
        if passphrase:
            kwargs["passphrase"] = passphrase
    elif password:
        kwargs["password"] = password
    else:
        print(
            "Set ARELORIA_SSH_PASSWORD or ARELORIA_SSH_KEY_PATH (key-based auth is recommended).",
            file=sys.stderr,
        )
        raise SystemExit(1)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(**kwargs)
    return client


def run_remote(script: str, get_pty: bool = True) -> int:
    client = _connect()
    try:
        _stdin, stdout, stderr = client.exec_command(script, get_pty=get_pty)
        for line in iter(stdout.readline, ""):
            sys.stdout.write(line)
        err = stderr.read().decode()
        if err:
            sys.stderr.write(err)
        code = stdout.channel.recv_exit_status()
        return int(code)
    finally:
        client.close()


def cmd_update(app_dir: str) -> int:
    ad = app_dir.replace("'", "'\"'\"'")
    script = (
        "set -euo pipefail; "
        f"cd '{ad}'; "
        "git fetch origin main; "
        "git reset --hard origin/main; "
        "bash deploy/update.sh"
    )
    return run_remote(script)


def main() -> int:
    parser = argparse.ArgumentParser(description="VPS deploy helper (Paramiko).")
    parser.add_argument("--app-dir", default=DEFAULT_APP_DIR, help=f"Remote repo root (default: {DEFAULT_APP_DIR})")

    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("update", help="Fetch main, reset to origin/main, run deploy/update.sh on the VPS.")

    ex = sub.add_parser("exec", help="Run a remote shell command string.")
    ex.add_argument("remote_shell", help="Command(s) to run on the server.")

    args = parser.parse_args()

    if args.cmd == "update":
        return cmd_update(args.app_dir)
    if args.cmd == "exec":
        return run_remote(args.remote_shell)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
