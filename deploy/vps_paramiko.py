#!/usr/bin/env python3
"""
SSH to the Wasd / Areloria VPS using Paramiko (password or private key).

Do not put passwords in the repo. Use environment variables or a prompt:

  export SSH_PASSWORD='...'   # or use key auth
  pip install -r deploy/requirements-vps-tools.txt
  python3 deploy/vps_paramiko.py run "uname -a"
  python3 deploy/vps_paramiko.py deploy
  python3 deploy/vps_paramiko.py shell
"""

from __future__ import annotations

import argparse
import getpass
import os
import shlex
import sys

try:
    import paramiko
except ImportError:
    print(
        "Paramiko is required: pip install -r deploy/requirements-vps-tools.txt",
        file=sys.stderr,
    )
    raise SystemExit(1)

DEFAULT_HOST = "46.202.154.25"
DEFAULT_USER = "root"
DEFAULT_PORT = 22
DEFAULT_APP_DIR = "/opt/areloria"
DEFAULT_REPO = "https://github.com/OuroborosCollective/Wasd.git"
DEFAULT_BRANCH = "main"


def connect_client(args: argparse.Namespace) -> paramiko.SSHClient:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    password = args.password or os.environ.get("SSH_PASSWORD")
    key_path = args.identity_file or os.environ.get("SSH_KEY_PATH")

    connect_kw: dict = {
        "hostname": args.host,
        "port": args.port,
        "username": args.user,
        "timeout": 30,
        "banner_timeout": 30,
        "auth_timeout": 30,
    }

    if key_path:
        connect_kw["key_filename"] = key_path
    if password:
        connect_kw["password"] = password

    if not password and not key_path:
        password = getpass.getpass(f"SSH password for {args.user}@{args.host}: ")
        connect_kw["password"] = password

    client.connect(**connect_kw)
    return client


def run_remote(client: paramiko.SSHClient, command: str) -> int:
    stdin, stdout, stderr = client.exec_command(command, get_pty=True)
    stdin.close()
    for line in iter(stdout.readline, ""):
        sys.stdout.write(line)
    err = stderr.read().decode()
    if err:
        sys.stderr.write(err)
    return stdout.channel.recv_exit_status()


def interactive_shell(client: paramiko.SSHClient, app_dir: str) -> int:
    """TTY forwarding for an interactive session (Unix terminals only)."""
    if not sys.stdin.isatty():
        print("shell mode requires a TTY; use: run '<command>'", file=sys.stderr)
        return 1
    try:
        import select
        import termios
        import tty
    except ImportError:
        print("shell mode is not supported on this platform; use: run '<command>'", file=sys.stderr)
        return 1

    chan = client.invoke_shell(term="xterm-256color")
    chan.send(f"cd {shlex.quote(app_dir)}\n")

    oldtty = termios.tcgetattr(sys.stdin)
    try:
        tty.setraw(sys.stdin)
        chan.settimeout(0.0)
        while True:
            r, _, _ = select.select([chan, sys.stdin], [], [], 0.2)
            if chan in r and chan.recv_ready():
                chunk = chan.recv(4096)
                if not chunk:
                    break
                sys.stdout.buffer.write(chunk)
                sys.stdout.flush()
            if sys.stdin in r:
                data = os.read(sys.stdin.fileno(), 4096)
                if not data:
                    break
                chan.send(data)
            if chan.exit_status_ready():
                break
    finally:
        termios.tcsetattr(sys.stdin, termios.TCSADRAIN, oldtty)
    try:
        if chan.exit_status_ready():
            return chan.recv_exit_status()
    except EOFError:
        pass
    return 0


def make_deploy_command(args: argparse.Namespace) -> str:
    app = shlex.quote(args.app_dir)
    branch = shlex.quote(args.branch)
    repo = shlex.quote(args.repo)
    return (
        "set -euo pipefail; "
        f'if [ ! -d "{args.app_dir}/.git" ]; then git clone {repo} {app}; fi; '
        f"cd {app}; "
        f"git fetch origin {branch}; "
        f"git checkout {branch}; "
        f"git reset --hard origin/{branch}; "
        "bash deploy/vps-prod-build.sh"
    )


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="VPS SSH via Paramiko (Wasd /opt/areloria).")
    p.add_argument("--host", default=os.environ.get("SSH_HOST", DEFAULT_HOST))
    p.add_argument("--user", default=os.environ.get("SSH_USER", DEFAULT_USER))
    p.add_argument("--port", type=int, default=int(os.environ.get("SSH_PORT", str(DEFAULT_PORT))))
    p.add_argument("--identity-file", help="SSH private key path (or SSH_KEY_PATH).")
    p.add_argument("--password", help="SSH password (prefer SSH_PASSWORD env).")
    p.add_argument("--app-dir", default=DEFAULT_APP_DIR)
    p.add_argument("--repo", default=DEFAULT_REPO)
    p.add_argument("--branch", default=DEFAULT_BRANCH)

    sub = p.add_subparsers(dest="mode", required=True)
    sub.add_parser("shell", help="Interactive shell in app directory.")

    rp = sub.add_parser("run", help="Run a single remote command.")
    rp.add_argument("command", help="Shell command")

    sub.add_parser("deploy", help="Clone or sync repo and run deploy/vps-prod-build.sh.")

    return p


def main() -> int:
    args = build_parser().parse_args()
    client: paramiko.SSHClient | None = None
    try:
        client = connect_client(args)

        if args.mode == "shell":
            return interactive_shell(client, args.app_dir)

        if args.mode == "run":
            return run_remote(client, args.command)

        if args.mode == "deploy":
            return run_remote(client, make_deploy_command(args))

    except (paramiko.SSHException, OSError) as e:
        print(f"SSH error: {e}", file=sys.stderr)
        return 1
    finally:
        if client:
            client.close()

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
