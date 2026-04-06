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
# Skip full apt upgrade in CI / non-interactive SSH (often fails: locks, prompts, non-root).
if [ -n "${CI:-}" ] || [ "${SKIP_APT_UPGRADE:-}" = "1" ]; then
  echo "[1/10] Skipping apt upgrade (CI or SKIP_APT_UPGRADE=1)."
else
  echo "[1/10] Updating system packages..."
  apt-get update -qq && apt-get upgrade -y -qq
fi

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
  git fetch origin main
  git reset --hard origin/main
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── 5–7. Install (workspace) + build ─────────────────────
# Prefer pnpm + pnpm-lock.yaml (same as GitHub CI). Falls back to per-package npm if needed.
export BUILD_NODE_OPTIONS="${BUILD_NODE_OPTIONS:---max-old-space-size=8192}"
cd "$APP_DIR"

if command -v pnpm >/dev/null 2>&1 && [ -f "$APP_DIR/pnpm-lock.yaml" ]; then
  echo "[5/10] pnpm install (workspace, frozen lockfile)..."
  corepack enable 2>/dev/null || true
  pnpm install --frozen-lockfile
  echo "[6–7/10] Sync world-assets + pnpm run build (client prebuild + server)..."
  node "$APP_DIR/scripts/sync-world-assets.mjs" || true
  NODE_OPTIONS="$BUILD_NODE_OPTIONS" pnpm run build
else
  echo "[5/10] pnpm workspace not available — npm install in server/ and client/..."
  cd "$APP_DIR/server"
  npm install
  cd "$APP_DIR/client"
  npm install
  echo "[6/10] Building client (Vite)..."
  cd "$APP_DIR/client"
  echo "[6a/10] Sync world-assets → client/public (and assets/models mirror)..."
  node "$APP_DIR/scripts/sync-world-assets.mjs" || true
  echo "Using client build NODE_OPTIONS=${BUILD_NODE_OPTIONS}"
  NODE_OPTIONS="$BUILD_NODE_OPTIONS" node -e "const v8=require('node:v8'); console.log('Heap limit MB:', Math.round(v8.getHeapStatistics().heap_size_limit/1024/1024));"
  NODE_OPTIONS="$BUILD_NODE_OPTIONS" node ./node_modules/vite/bin/vite.js build
  echo "[7/10] Building server (TypeScript)..."
  cd "$APP_DIR/server"
  npm run build
fi

# ── 8. Create symlink for game-data ───────────────────────
echo "[8/10] Setting up game-data symlink..."
cd "$APP_DIR/server"
ln -sf ../game-data game-data 2>/dev/null || true

# ── 9. Create .env if not exists + Firebase Admin key path ──
echo "[9/10] Checking .env configuration..."
SECRETS_DIR="$APP_DIR/secrets"
FIREBASE_KEY_FILE="$SECRETS_DIR/firebase-adminsdk.json"
mkdir -p "$SECRETS_DIR"
chmod 700 "$SECRETS_DIR" 2>/dev/null || true

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

# Firebase Admin (server) — upload JSON to secrets/ then run:
#   ./deploy/setup-firebase-service-account.sh /path/to/key.json
# Or place file at: /opt/areloria/secrets/firebase-adminsdk.json (deploy links it on next run)
# FIREBASE_SERVICE_ACCOUNT_KEY=/opt/areloria/secrets/firebase-adminsdk.json
# FIREBASE_PROJECT_ID=your-gcp-project-id
ENVEOF
  echo "⚠️  Please edit $APP_DIR/.env and fill in PGPASSWORD and JWT_SECRET!"
fi

# If Admin SDK JSON exists and .env has no Firebase lines, append paths (no secret in repo).
if [ -f "$FIREBASE_KEY_FILE" ] && [ -f "$APP_DIR/.env" ]; then
  if ! grep -q '^[[:space:]]*FIREBASE_SERVICE_ACCOUNT_KEY=' "$APP_DIR/.env" 2>/dev/null; then
    {
      echo ""
      echo "# Firebase Admin — auto-linked (file present at deploy time)"
      echo "FIREBASE_SERVICE_ACCOUNT_KEY=$FIREBASE_KEY_FILE"
    } >> "$APP_DIR/.env"
    echo "✅ Linked FIREBASE_SERVICE_ACCOUNT_KEY -> $FIREBASE_KEY_FILE"
  fi
  if ! grep -q '^[[:space:]]*GOOGLE_APPLICATION_CREDENTIALS=' "$APP_DIR/.env" 2>/dev/null; then
    echo "GOOGLE_APPLICATION_CREDENTIALS=$FIREBASE_KEY_FILE" >> "$APP_DIR/.env"
    echo "✅ Linked GOOGLE_APPLICATION_CREDENTIALS -> $FIREBASE_KEY_FILE"
  fi
fi

# ── 10. Start with PM2 ───────────────────────────────────
echo "[10/10] Starting server with PM2..."
cd "$APP_DIR"
# cwd + CLIENT_ROOT_DIR avoid serving from /opt/client/dist when script lives under server/dist only
APP_DIR="$APP_DIR" bash "$APP_DIR/deploy/write_pm2_ecosystem.sh"

# Stop existing instance if running
pm2 stop areloria 2>/dev/null || true
pm2 delete areloria 2>/dev/null || true

# Start new instance
pm2 start "$APP_DIR/ecosystem.config.cjs"
pm2 save
pm2 startup 2>/dev/null || true

# ── 11. Post-deploy verification gate ─────────────────────
echo "[11/11] Verifying service health/endpoints..."
verify_url() {
  local url="$1"
  local name="$2"
  local attempts=12
  local wait_sec=5
  local code=""

  for i in $(seq 1 "$attempts"); do
    code="$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)"
    if [ "$code" = "200" ]; then
      echo "✅ ${name} OK (${url})"
      return 0
    fi
    echo "⏳ ${name} not ready (${url}) [attempt ${i}/${attempts}] status=${code:-n/a}"
    sleep "$wait_sec"
  done

  echo "❌ ${name} failed after ${attempts} attempts (${url}), last status=${code:-n/a}"
  return 1
}

verify_url "http://127.0.0.1:3000/health" "Health endpoint"
verify_url "http://127.0.0.1:3000/" "Client root"
verify_url "http://127.0.0.1:3000/gm/" "GM console"

echo ""
echo "======================================================"
echo "  ✅ Areloria MMORPG deployed successfully!"
echo "======================================================"
echo "  URL:     http://${DOMAIN}:3000"
echo "  PM2:     pm2 status"
echo "  Logs:    pm2 logs areloria"
echo "  Restart: pm2 restart areloria"
echo "======================================================"
