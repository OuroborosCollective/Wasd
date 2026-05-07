#!/bin/bash
set -euo pipefail

# Use environment variable or default to placeholder
PRODUCTION_IP="${PRODUCTION_IP:-your-vps-ip}"
DEPLOY_USER="${DEPLOY_USER:-user}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/areloria}"

echo "Starting deployment to ${PRODUCTION_IP}..."

ssh -t "${DEPLOY_USER}@${PRODUCTION_IP}" "cd ${DEPLOY_PATH} && git checkout main && git pull origin main && pnpm install --frozen-lockfile && pnpm run build"

echo "Deployment completed successfully."
