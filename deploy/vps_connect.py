#!/usr/bin/env python3
"""
Connect to and operate the Areloria VPS over SSH.

This script avoids hardcoding secrets. You can either:
- use interactive SSH password prompt (default), or
- use --password / SSH_PASSWORD together with sshpass (optional).

Examples:
  python3 deploy/vps_connect.py shell
  python3 deploy/vps_connect.py run "uname -a"
  python3 deploy/vps_connect.py deploy --branch cursor/mmorpq-playcanvas-connection-3e3d
"""

from __future__ import annotations

import argparse
import os
import shlex
import shutil
import subprocess
import sys

DEFAULT_HOST = "46.202.154.25"
DEFAULT_USER = "root"
DEFAULT_PORT = 22
DEFAULT_APP_DIR = "/opt/areloria"
DEFAULT_REPO = "https://github.com/OuroborosCollective/Wasd.git"
DEFAULT_BRANCH = "cursor/mmorpq-playcanvas-connection-3e3d"


def require_binary(binary_name: str) -> None:
    if shutil.which(binary_name):
        return
    print(f"Error: required binary '{binary_name}' is not available in PATH.", file=sys.stderr)
    sys.exit(1)


def build_ssh_command(args: argparse.Namespace) -> list[str]:
    host_target = f"{args.user}@{args.host}"
    command: list[str] = [
        "ssh",
        "-o",
        "StrictHostKeyChecking=accept-new",
    ]
    if args.port != DEFAULT_PORT:
        command.extend(["-p", str(args.port)])
    if args.identity_file:
        command.extend(["-i", args.identity_file])
    command.append(host_target)

    password = args.password or os.getenv("SSH_PASSWORD")
    if password:
        require_binary("sshpass")
        return ["sshpass", "-p", password, *command]
    return command


def run_ssh(args: argparse.Namespace, remote_command: str | None, force_tty: bool = False) -> int:
    ssh_command = build_ssh_command(args)
    if force_tty:
        ssh_command.append("-t")
    if remote_command:
        ssh_command.append(remote_command)
    return subprocess.call(ssh_command)


def make_deploy_script(args: argparse.Namespace) -> str:
    app_dir = shlex.quote(args.app_dir)
    branch = shlex.quote(args.branch)
    repo = shlex.quote(args.repo)
    return (
        "set -euo pipefail; "
        f'if [ ! -d "{args.app_dir}/.git" ]; then '
        f"git clone {repo} {app_dir}; "
        "fi; "
        f"cd {app_dir}; "
        f"git fetch origin {branch}; "
        f"git checkout {branch}; "
        f"git pull origin {branch}"
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="SSH helper for Areloria VPS workflows.")
    parser.add_argument("--host", default=DEFAULT_HOST, help=f"VPS host (default: {DEFAULT_HOST})")
    parser.add_argument("--user", default=DEFAULT_USER, help=f"SSH user (default: {DEFAULT_USER})")
    parser.add_argument("--port", type=int, default=DEFAULT_PORT, help=f"SSH port (default: {DEFAULT_PORT})")
    parser.add_argument("--identity-file", help="Path to SSH private key file")
    parser.add_argument(
        "--password",
        help="Optional password for sshpass. Prefer key-based auth or interactive password prompt.",
    )
    parser.add_argument("--app-dir", default=DEFAULT_APP_DIR, help=f"Remote app directory (default: {DEFAULT_APP_DIR})")
    parser.add_argument("--repo", default=DEFAULT_REPO, help=f"Git repository URL (default: {DEFAULT_REPO})")
    parser.add_argument("--branch", default=DEFAULT_BRANCH, help=f"Git branch for deploy mode (default: {DEFAULT_BRANCH})")

    subparsers = parser.add_subparsers(dest="mode", required=True)
    subparsers.add_parser("shell", help="Open interactive shell on VPS (inside app directory).")

    run_parser = subparsers.add_parser("run", help="Run one remote command.")
    run_parser.add_argument("command", help="Shell command to execute remotely")

    subparsers.add_parser("deploy", help="Fetch/checkout/pull the configured branch on VPS.")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.mode == "shell":
        remote = f"cd {shlex.quote(args.app_dir)} && exec bash -l"
        return run_ssh(args, remote, force_tty=True)

    if args.mode == "run":
        return run_ssh(args, args.command, force_tty=True)

    if args.mode == "deploy":
        return run_ssh(args, make_deploy_script(args), force_tty=True)

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
