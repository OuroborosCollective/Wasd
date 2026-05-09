#!/bin/bash
set -euo pipefail

# Use environment variable or default to placeholder
# Suggested usage: PRODUCTION_IP=1.2.3.4 DEPLOY_USER=admin ./scripts/deploy-vps.sh
PRODUCTION_IP="${PRODUCTION_IP:-your-vps-ip}"
DEPLOY_USER="${DEPLOY_USER:-user}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/areloria}"

echo "Starting deployment to ${PRODUCTION_IP} as ${DEPLOY_USER}..."

# Ensure we are deploying from the correct branch and have latest changes
ssh -t "${DEPLOY_USER}@${PRODUCTION_IP}" "cd ${DEPLOY_PATH} && \
    git fetch origin && \
    git checkout main && \
    git reset --hard origin/main && \
    pnpm install --frozen-lockfile && \
    pnpm run build"

echo "Deployment to ${PRODUCTION_IP} completed successfully."
