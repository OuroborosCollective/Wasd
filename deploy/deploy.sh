#!/bin/bash
set -euo pipefail

# Required environment variables check
: "${DEPLOY_HOST:?Error: DEPLOY_HOST environment variable is not set.}"
: "${DEPLOY_USER:?Error: DEPLOY_USER environment variable is not set.}"
: "${DEPLOY_TARGET_DIR:?Error: DEPLOY_TARGET_DIR environment variable is not set.}"
: "${DEPLOY_SOURCE_DIR:?Error: DEPLOY_SOURCE_DIR environment variable is not set.}"

# Optional SSH identity file
SSH_IDENTITY_FLAG=""
if [ -n "${DEPLOY_SSH_KEY:-}" ]; then
    SSH_IDENTITY_FLAG="-i ${DEPLOY_SSH_KEY}"
fi

echo "Starting deployment to ${DEPLOY_HOST}..."

# Sync files using rsync
rsync -avz --delete \
    -e "ssh ${SSH_IDENTITY_FLAG} -o StrictHostKeyChecking=accept-new" \
    "${DEPLOY_SOURCE_DIR}/" \
    "${DEPLOY_USER}@${DEPLOY_HOST}:${DEPLOY_TARGET_DIR}/"

echo "Deployment finished successfully."