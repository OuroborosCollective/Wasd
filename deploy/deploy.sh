#!/bin/bash
# ============================================================
# Areloria MMORPG – VPS Deployment Script
# Target: srv1491137.hstgr.cloud (Hostinger VPS)
# Usage:  chmod +x deploy.sh && ./deploy.sh
# ============================================================

set -e

REPO_URL="https://github.com/OuroborosCollective/Wasd.git"
APP_DIR="/opt/areloria"
SERVICE_NAME="areloria"
NODE_VERSION="22"
DOMAIN="srv1491137.hstgr.cloud"

echo "======================================================"
echo "  Areloria MMORPG – Deployment v0.4.0"
echo "======================================================"

# ── 1. Update system ──────────────────────────────────────
echo "[1/10] Updating system packages..."
apt-get update -qq && apt-get upgrade -y -qq

# ── 2. Install Node.js ────────────────────────────────────
echo "[2/10] Installing Node.js ${NODE_VERSION}..."
CURRENT_NODE_MAJOR="$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || echo 0)"
if [ -z "$CURRENT_NODE_MAJOR" ] || [ "$CURRENT_NODE_MAJOR" -lt "$NODE_VERSION" ]; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node --version), npm: $(npm --version)"

# ── 3. Install pnpm ───────────────────────────────────────
echo "[3/10] Installing pnpm..."
npm install -g pnpm pm2 2>/dev/null || true

# ── 4. Clone / update repo ───────────────────────────────
echo "[4/10] Cloning/updating repository..."
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git pull origin main
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 5. Install dependencies ───────────────────────────────
echo "[5/10] Installing server dependencies..."
cd "$APP_DIR/server"
npm install

echo "[5b/10] Installing client dependencies..."
cd "$APP_DIR/client"
npm install

# ── 6. Build client ───────────────────────────────────────
echo "[6/10] Building client (Vite)..."
cd "$APP_DIR/client"
# Avoid OOM on VPS during large Vite bundle render.
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build

# ── 7. Build server ───────────────────────────────────────
echo "[7/10] Building server (TypeScript)..."
cd "$APP_DIR/server"
npm run build
unset NODE_OPTIONS

# ── 8. Create symlink for game-data ───────────────────────
echo "[8/10] Setting up game-data symlink..."
cd "$APP_DIR/server"
ln -sf ../game-data game-data 2>/dev/null || true

# ── 9. Create .env if not exists ─────────────────────────
echo "[9/10] Checking .env configuration..."
if [ ! -f "$APP_DIR/.env" ]; then
  echo "⚠️  WARNING: No .env file found! Creating template..."
  cat > "$APP_DIR/.env" << 'ENVEOF'
# Areloria MMORPG Environment Variables
# Fill in all values before starting the server!

# Server
PORT=3000
NODE_ENV=production

# PostgreSQL (Azure)
PGHOST=are.postgres.database.azure.com
PGPORT=5432
PGDATABASE=areloria
PGUSER=Thosu
PGPASSWORD=CHANGE_ME
PGSSL=true

# Firebase (Client Auth)
VITE_FIREBASE_API_KEY=AIzaSyA96_GG61GsDBHh4ysw4-AfoRHVJ_MNQJw
VITE_FIREBASE_AUTH_DOMAIN=studio-8985161445-f6ce5.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=studio-8985161445-f6ce5
VITE_FIREBASE_MESSAGING_SENDER_ID=426167977735
VITE_FIREBASE_APP_ID=1:426167977735:web:5e2951f4365b233af167a2

# PayPal (Live)
PAYPAL_CLIENT_ID=Ad9Dhbq69h7OJgx9sXhdOCpQWVmIxy03i4gPIZLYPpn23h9vca3UHop996hP8i_BVV3CckntggNTiZwR
PAYPAL_CLIENT_SECRET=EFj9uptvjpqrnvy6V38dlkDHbuYwRgNNoY9ptsXehEEj0ftKADHZ8XgRz3vMCN_l1Yw2oIgR2xoGWBkF
PAYPAL_MODE=live

# JWT Secret (change this!)
JWT_SECRET=CHANGE_THIS_TO_A_RANDOM_SECRET_STRING
ENVEOF
  echo "⚠️  Please edit $APP_DIR/.env and fill in PGPASSWORD and JWT_SECRET!"
fi

# ── 10. Start with PM2 ───────────────────────────────────
echo "[10/10] Starting server with PM2..."
cd "$APP_DIR"

# Create PM2 ecosystem config
cat > "$APP_DIR/ecosystem.config.cjs" << 'PM2EOF'
module.exports = {
  apps: [{
    name: 'areloria',
    script: './server/dist/index.js',
    cwd: '/opt/areloria',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_file: '/opt/areloria/.env',
    error_file: '/var/log/areloria/error.log',
    out_file: '/var/log/areloria/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
PM2EOF

mkdir -p /var/log/areloria

# Stop existing instance if running
pm2 stop areloria 2>/dev/null || true
pm2 delete areloria 2>/dev/null || true

# Start new instance
pm2 start "$APP_DIR/ecosystem.config.cjs"
pm2 save
pm2 startup 2>/dev/null || true

echo ""
echo "======================================================"
echo "  ✅ Areloria MMORPG deployed successfully!"
echo "======================================================"
echo "  URL:     http://${DOMAIN}:3000"
echo "  PM2:     pm2 status"
echo "  Logs:    pm2 logs areloria"
echo "  Restart: pm2 restart areloria"
echo "======================================================"
