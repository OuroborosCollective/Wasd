#!/bin/bash
# Quick update script - pulls latest code and rebuilds
set -e

APP_DIR="/opt/areloria"
echo "🔄 Updating Areloria MMORPG..."

cd "$APP_DIR"
git pull origin main

# Rebuild client (heap limit set in client/package.json "build" for large Vite bundles)
cd "$APP_DIR/client"
npm install
npm run build

# Rebuild server (includes content validation like deploy.sh)
cd "$APP_DIR/server"
npm install
npm run build

# Keep PM2 cwd + CLIENT_ROOT_DIR aligned with repo (fixes wrong /opt/client static path)
cd "$APP_DIR"
APP_DIR="$APP_DIR" bash "$APP_DIR/deploy/write_pm2_ecosystem.sh"

# Restart or first start PM2
if pm2 describe areloria >/dev/null 2>&1; then
  pm2 restart areloria
else
  pm2 start "$APP_DIR/ecosystem.config.cjs"
fi
pm2 save 2>/dev/null || true

echo "✅ Update complete!"
pm2 status
