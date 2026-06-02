#!/usr/bin/env python3
"""
GitHub PR Management Tool

Usage:
    python3 tools/github/pr-manager.py status <pr-number>
    python3 tools/github/pr-manager.py merge <pr-number>
    python3 tools/github/pr-manager.py ready <pr-number>
    python3 tools/github/pr-manager.py checks <pr-number>

Requires GITHUB_TOKEN environment variable.

Examples:
    python3 tools/github/pr-manager.py status 1586
    python3 tools/github/pr-manager.py merge 1586
"""

import argparse
import json
import os
import sys
import subprocess
from typing import Optional

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", os.environ.get("GITHUB_API_KEY", ""))
REPO_OWNER = "OuroborosCollective"
REPO_NAME = "Wasd"


def api_request(method: str, endpoint: str, data: Optional[dict] = None) -> dict:
    """Make a GitHub API request."""
    if not GITHUB_TOKEN:
        print("Error: GITHUB_TOKEN not set")
        sys.exit(1)
    
    url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}{endpoint}"
    
    cmd = [
        "curl", "-s", "-X", method,
        "-H", f"Authorization: token {GITHUB_TOKEN}",
        "-H", "Accept: application/vnd.github.v3+json"
    ]
    
    if data:
        cmd.extend(["-H", "Content-Type: application/vnd.github.v3+json"])
        cmd.extend(["-d", json.dumps(data)])
    
    cmd.append(url)
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    return json.loads(result.stdout)


def get_pr(pr_number: int) -> dict:
    """Get PR details."""
    return api_request("GET", f"/pulls/{pr_number}")


def get_pr_commits(pr_number: int) -> list:
    """Get PR commits."""
    return api_request("GET", f"/pulls/{pr_number}/commits")


def get_check_runs(pr_number: int) -> list:
    """Get check runs for PR."""
    commits = get_pr_commits(pr_number)
    if not commits:
        return []
    
    latest_sha = commits[-1]["sha"]
    return api_request("GET", f"/commits/{latest_sha}/check-runs?per_page=20").get("check_runs", [])


def cmd_status(pr_number: int):
    """Show PR status."""
    pr = get_pr(pr_number)
    
    print("=" * 60)
    print(f"PR #{pr_number}: {pr.get('title', 'N/A')}")
    print("=" * 60)
    print(f"State:    {pr.get('state', 'N/A')}")
    print(f"Draft:    {pr.get('draft', 'N/A')}")
    print(f"Mergeable: {pr.get('mergeable', 'N/A')}")
    print(f"Mergeable State: {pr.get('mergeable_state', 'N/A')}")
    print(f"URL:      {pr.get('html_url', 'N/A')}")
    print()
    
    commits = get_pr_commits(pr_number)
    print(f"Commits: {len(commits)}")
    for c in commits:
        print(f"  - {c['sha'][:8]} {c['commit']['message'].split(chr(10))[0]}")
    print()
    
    checks = get_check_runs(pr_number)
    print(f"Checks: {len(checks)}")
    
    all_ok = True
    for check in checks:
        name = check.get("name", "Unknown")
        conclusion = check.get("conclusion") or check.get("status", "pending")
        
        if conclusion in ["success", "skipped", "neutral"]:
            status = "✅"
        else:
            status = "❌"
            all_ok = False
        
        print(f"  {status} {name}: {conclusion}")
    
    print()
    print("=" * 60)
    if all_ok and pr.get("mergeable"):
        print("✅ PR is ready to merge")
    else:
        print("❌ PR has issues or is not mergeable")
    print("=" * 60)


def cmd_ready(pr_number: int):
    """Mark PR as ready for review."""
    print(f"Converting PR #{pr_number} to ready...")
    
    result = api_request("PUT", f"/pulls/{pr_number}/ready-for-review")
    
    if result.get("draft") is None:
        print("✅ PR is now ready for review")
    else:
        print(f"⚠️  Draft status: {result.get('draft')}")


def cmd_merge(pr_number: int):
    """Merge PR."""
    pr = get_pr(pr_number)
    
    if pr.get("draft"):
        print("PR is still draft. Converting to ready first...")
        cmd_ready(pr_number)
    
    print(f"Merging PR #{pr_number}...")
    
    result = api_request("PUT", f"/pulls/{pr_number}/merge", {"merge_method": "merge"})
    
    if result.get("merged"):
        print(f"✅ PR #{pr_number} merged successfully!")
        print(f"   Merge commit: {result.get('merge_commit_sha')}")
    else:
        print(f"❌ Merge failed: {result.get('message', 'Unknown error')}")
        sys.exit(1)


def cmd_checks(pr_number: int):
    """Show only checks for PR."""
    checks = get_check_runs(pr_number)
    
    print("=" * 60)
    print(f"Checks for PR #{pr_number}")
    print("=" * 60)
    
    for check in checks:
        name = check.get("name", "Unknown")
        conclusion = check.get("conclusion") or check.get("status", "pending")
        
        if conclusion in ["success", "skipped", "neutral"]:
            status = "✅"
        elif conclusion == "failure":
            status = "❌"
        else:
            status = "⏳"
        
        print(f"  {status} {name}: {conclusion}")
    
    failed = [c for c in checks if c.get("conclusion") == "failure"]
    if failed:
        print(f"\n❌ {len(failed)} check(s) failed:")
        for c in failed:
            print(f"   - {c['name']}")


def main():
    parser = argparse.ArgumentParser(description="GitHub PR Management Tool")
    subparsers = parser.add_subparsers(dest="command", help="Commands")
    
    subparsers.add_parser("status", help="Show PR status").add_argument("pr", type=int)
    subparsers.add_parser("merge", help="Merge PR").add_argument("pr", type=int)
    subparsers.add_parser("ready", help="Mark PR as ready").add_argument("pr", type=int)
    subparsers.add_parser("checks", help="Show PR checks").add_argument("pr", type=int)
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    if args.command == "status":
        cmd_status(args.pr)
    elif args.command == "merge":
        cmd_merge(args.pr)
    elif args.command == "ready":
        cmd_ready(args.pr)
    elif args.command == "checks":
        cmd_checks(args.pr)


if __name__ == "__main__":
    main()