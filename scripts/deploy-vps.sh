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

# SSH Befehl zusammenstellen
SSH_CMD="ssh -o StrictHostKeyChecking=no"

if [ -n "${SSH_PASSWORD:-}" ]; then
    echo "Using password authentication..."
    if ! command -v sshpass &> /dev/null; then
        echo "Installing sshpass..."
        sudo apt-get update && sudo apt-get install -y sshpass
    fi
    SSH_PREFIX="sshpass -p ${SSH_PASSWORD}"
else
    echo "Using key authentication..."
    SSH_PREFIX=""
fi

# Deployment-Befehle auf dem VPS ausführen
$SSH_PREFIX $SSH_CMD "${DEPLOY_USER}@${PRODUCTION_IP}" "
    set -e
    cd ${DEPLOY_PATH}
    echo '--- Fetching latest code ---'
    git fetch origin main
    git reset --hard origin/main
    
    echo '--- Installing dependencies ---'
    export PNPM_HOME=\"\$HOME/.local/share/pnpm\"
    export PATH=\"\$PNPM_HOME:\$PATH\"
    export COREPACK_ENABLE_AUTO=0
    
    # Disable corepack package manager to force pnpm
    if command -v corepack &> /dev/null; then
        corepack disable || true
    fi
    
    # Remove yarn enablement if it was set
    if [ -f package.json ]; then
        # Check if package.json has packageManager field
        if grep -q '\"packageManager\"' package.json; then
            echo 'Removing packageManager field...'
            node -e \"const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));delete p.packageManager;fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\\n')\"
        fi
    fi
    
    export PNPM_HOME=\"\$HOME/.local/share/pnpm\"
    export PATH=\"\$PNPM_HOME:\$PATH\"
    
    if ! command -v pnpm &> /dev/null; then
        echo 'pnpm not found, installing via npm...'
        npm install -g pnpm
    fi
    
    # Use --ignore-scripts to skip prepare scripts
    pnpm install --frozen-lockfile --ignore-scripts
    
    echo '--- Building project ---'
    pnpm run build || { echo 'Build failed, aborting restart'; exit 1; }
    
    echo '--- Restarting services ---'
    if command -v pm2 &> /dev/null; then
        pm2 restart all || echo 'PM2 restart failed, skipping...'
    fi
"

echo "Deployment completed successfully."
