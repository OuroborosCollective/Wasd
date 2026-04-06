#!/usr/bin/env bash
# On the VPS: update to latest main and run full deploy + local HTTP checks.
# Usage (as root or deploy user):
#   cd /opt/areloria && bash deploy/pull-and-deploy.sh
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/areloria}"
cd "$APP_DIR"
if [ ! -d ".git" ]; then
  echo "No .git in $APP_DIR — clone the repo first."
  exit 1
fi
git fetch origin main
git reset --hard origin/main
chmod +x deploy/deploy.sh
./deploy/deploy.sh
bash deploy/verify-vps-local.sh
