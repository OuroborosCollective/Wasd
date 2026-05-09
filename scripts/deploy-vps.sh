#!/bin/bash
set -euo pipefail

# Use environment variable or default to placeholder
PRODUCTION_IP="${PRODUCTION_IP:-your-vps-ip}"
DEPLOY_USER="${DEPLOY_USER:-user}"
DEPLOY_PATH="${DEPLOY_PATH:-/opt/areloria}"

echo "Starting deployment to ${PRODUCTION_IP}..."

# SSH-Key Setup falls vorhanden
if [ -n "${SSH_PRIVATE_KEY:-}" ]; then
    echo "Setting up SSH key..."
    mkdir -p ~/.ssh
    echo "$SSH_PRIVATE_KEY" > ~/.ssh/id_rsa
    chmod 600 ~/.ssh/id_rsa
    ssh-keyscan -H "$PRODUCTION_IP" >> ~/.ssh/known_hosts
fi

# Deployment-Befehle auf dem VPS ausführen
# Wir nutzen -o StrictHostKeyChecking=no falls known_hosts nicht reicht
ssh -i ~/.ssh/id_rsa -o StrictHostKeyChecking=no "${DEPLOY_USER}@${PRODUCTION_IP}" "
    set -e
    cd ${DEPLOY_PATH}
    echo '--- Fetching latest code ---'
    git fetch origin main
    git reset --hard origin/main
    
    echo '--- Installing dependencies ---'
    # pnpm Pfad oft nicht im Standard-SSH-Pfad
    export PNPM_HOME=\"\$HOME/.local/share/pnpm\"
    export PATH=\"\$PNPM_HOME:\$PATH\"
    
    if ! command -v pnpm &> /dev/null; then
        echo 'pnpm not found, trying to use npm to install pnpm...'
        npm install -g pnpm || true
    fi
    
    pnpm install --no-frozen-lockfile
    
    echo '--- Building project ---'
    pnpm run build
    
    echo '--- Restarting services ---'
    if command -v pm2 &> /dev/null; then
        pm2 restart all || echo 'PM2 restart failed, skipping...'
    fi
"

echo "Deployment completed successfully."
