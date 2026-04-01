#!/bin/bash
# Quick update script - pulls latest code and rebuilds
set -e

APP_DIR="/opt/areloria"
echo "🔄 Updating Areloria MMORPG..."

cd "$APP_DIR"
git pull origin main

# Rebuild client (Vite needs extra heap on small VPS default ~2GB limit)
cd "$APP_DIR/client"
npm install
npm run build

# Rebuild server
cd "$APP_DIR/server"
npm install
npx tsc

# Restart PM2
pm2 restart areloria

echo "✅ Update complete!"
pm2 status
