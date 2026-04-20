#!/bin/bash
# =============================================================================
# Wasd → Supabase Setup Script
# Run on VPS (srv1491137.hstgr.cloud) as root
# Usage: bash setup-wasd.sh
# =============================================================================

set -e

APP_DIR="/opt/areloria"
SERVICE_NAME="areloria"
NODE_VERSION="22"

echo "======================================================"
echo "  Wasd → Supabase Setup (arelogic.space)"
echo "======================================================"

# ── 1. System packages ──────────────────────────────────
echo "[1/9] Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq curl git build-essential nginx certbot python3-certbot-nginx 2>/dev/null || true

# ── 2. Node.js ──────────────────────────────────────────
echo "[2/9] Checking Node.js..."
CURRENT_NODE_MAJOR="$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/' || echo 0)"
if [ "$CURRENT_NODE_MAJOR" -lt "$NODE_VERSION" ] 2>/dev/null; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  apt-get install -y nodejs
fi
echo "  Node: $(node --version), npm: $(npm --version)"

# ── 3. pnpm + PM2 ──────────────────────────────────────
echo "[3/9] Installing pnpm + PM2..."
npm install -g pnpm pm2 2>/dev/null || true
corepack enable 2>/dev/null || true

# ── 4. Clone/update repo ───────────────────────────────
echo "[4/9] Setting up repository..."
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch origin main
  git reset --hard origin/main
else
  git clone "https://github.com/OuroborosCollective/Wasd.git" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 5. Create .env ─────────────────────────────────────
echo "[5/9] Writing .env..."
cat > "$APP_DIR/.env" << 'ENVEOF'
# =============================================================================
# Wasd — Supabase Connection (arelogic.space)
# =============================================================================

# --- Core ---
NODE_ENV=production
PORT=3000

# --- Public URLs ---
PUBLIC_WEBSOCKET_URL=wss://arelogic.space/ws

# --- Supabase (Server) ---
SUPABASE_URL=https://supabase.arelogic.space:8443
SUPABASE_PUBLIC_URL=https://supabase.arelogic.space:8443
API_EXTERNAL_URL=https://supabase.arelogic.space:8443
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsICAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q
SUPABASE_JWT_SECRET=Sup3baseJWTSecret-1491137-LongEnough

# --- Supabase (Client — embedded at Vite build) ---
VITE_SUPABASE_URL=https://supabase.arelogic.space:8443
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsICAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE

# --- Database (Postgres — same VPS, Docker exposed) ---
DATABASE_URL=postgresql://postgres:Sup3base-1491137-Strong!@127.0.0.1:5432/postgres
DATABASE_SSL_DISABLED=1

# --- Auth ---
USE_SUPABASE_WS_LOGIN=1
ALLOW_GUEST_LOGIN=1
ALLOW_DEV_LOGIN=0
JWT_SECRET=Sup3baseJWTSecret-1491137-LongEnough

# --- Persistence ---
PERSISTENCE_DRIVER=auto

# --- Site ---
SITE_URL=https://arelogic.space
ENVEOF

chmod 600 "$APP_DIR/.env"

# ── 6. Check Postgres connectivity ─────────────────────
echo "[6/9] Checking Postgres connectivity..."
if python3 -c "import socket; s=socket.socket(); s.settimeout(3); exit(0 if s.connect_ex(('127.0.0.1',5432))==0 else 1)" 2>/dev/null; then
  echo "  ✓ Postgres reachable on 127.0.0.1:5432"
elif python3 -c "import socket; s=socket.socket(); s.settimeout(3); exit(0 if s.connect_ex(('172.17.0.1',5432))==0 else 1)" 2>/dev/null; then
  echo "  ✓ Postgres reachable on 172.17.0.1:5432 (Docker gateway)"
  sed -i 's|@127.0.0.1:5432|@172.17.0.1:5432|' "$APP_DIR/.env"
else
  echo "  ⚠ WARNING: Postgres not reachable on 127.0.0.1:5432"
  echo "  You may need to expose port 5432 in your Supabase docker-compose.yml:"
  echo "    ports:"
  echo "      - \"127.0.0.1:5432:5432\""
  echo "  Then: docker compose down && docker compose up -d"
fi

# ── 7. Install + Build ─────────────────────────────────
echo "[7/9] Installing dependencies + building..."
cd "$APP_DIR"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Sync world-assets
node "$APP_DIR/scripts/sync-world-assets.mjs" 2>/dev/null || true

# Build (client + server)
NODE_OPTIONS="--max-old-space-size=8192" pnpm run build

# Game-data symlink
cd "$APP_DIR/server"
ln -sf ../game-data game-data 2>/dev/null || true

# ── 8. PM2 setup ───────────────────────────────────────
echo "[8/9] Configuring PM2..."
mkdir -p /var/log/areloria

cat > "$APP_DIR/ecosystem.config.cjs" << PM2EOF
module.exports = {
  apps: [{
    name: 'areloria',
    script: './server/dist/index.js',
    cwd: '${APP_DIR}',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      CLIENT_ROOT_DIR: '${APP_DIR}/client',
    },
    env_file: '${APP_DIR}/.env',
    error_file: '/var/log/areloria/error.log',
    out_file: '/var/log/areloria/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
PM2EOF

cd "$APP_DIR"
pm2 delete "$SERVICE_NAME" 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true

# ── 9. Nginx reverse proxy ─────────────────────────────
echo "[9/9] Configuring Nginx..."
cat > /etc/nginx/sites-available/wasd << NGINXEOF
server {
    listen 80;
    server_name arelogic.space;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/wasd /etc/nginx/sites-enabled/wasd
nginx -t && systemctl reload nginx 2>/dev/null || echo "  ⚠ Nginx config failed — check manually"

echo ""
echo "======================================================"
echo "  Setup complete!"
echo "======================================================"
echo ""
echo "  Health check:  curl -s http://127.0.0.1:3000/health | python3 -m json.tool"
echo "  PM2 status:    pm2 status"
echo "  PM2 logs:      pm2 logs areloria"
echo ""
echo "  Next steps:"
echo "  1. Verify Postgres port (see warning above if needed)"
echo "  2. Set up HTTPS: certbot --nginx -d arelogic.space"
echo "  3. Update PUBLIC_WEBSOCKET_URL to wss://arelogic.space/ws after HTTPS"
echo ""
