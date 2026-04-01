#!/bin/bash
# Quick update script - pulls latest code and rebuilds
set -e

APP_DIR="/opt/areloria"
BUILD_NODE_OPTIONS="${BUILD_NODE_OPTIONS:---max-old-space-size=6144}"
echo "🔄 Updating Areloria MMORPG..."

cd "$APP_DIR"
git pull origin main

# Rebuild client
cd "$APP_DIR/client"
npm install
NODE_OPTIONS="$BUILD_NODE_OPTIONS" npx vite build

# Rebuild server
cd "$APP_DIR/server"
npm install
npx tsc

# Restart PM2
pm2 restart areloria

echo "✅ Update complete!"
pm2 status
