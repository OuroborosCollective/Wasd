#!/bin/bash
# Arelorian VPS Setup Script
# Run as: root on your VPS

set -e

echo "=== Arelorian VPS Setup ==="
echo "This script will set up the complete game server and client."

# Configuration
GAME_DIR="/opt/areloria"
DOMAIN="arelorian.de"
USER="root"

# Update and install dependencies
echo "[1/8] Updating packages..."
apt-get update
apt-get install -y curl git nginx certbot python3-certbot-nginx build-essential

# Install Node.js 20
echo "[2/8] Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install pnpm
echo "[3/8] Installing pnpm..."
npm install -g pnpm

# Clone or update repository
echo "[4/8] Setting up Areloria..."
if [ -d "$GAME_DIR" ]; then
    echo "Repository already exists at $GAME_DIR, pulling latest..."
    cd "$GAME_DIR" && git pull origin main
else
    mkdir -p "$GAME_DIR"
    git clone https://github.com/OuroborosCollective/Wasd.git "$GAME_DIR"
    cd "$GAME_DIR"
fi

# Install dependencies
echo "[5/8] Installing dependencies..."
pnpm install --frozen-lockfile

# Create .env file
echo "[6/8] Creating .env configuration..."
cp -n deploy/.env.production.template "$GAME_DIR/.env" 2>/dev/null || true
cat >> "$GAME_DIR/.env" << 'EOF'
NODE_ENV=production
PORT=3000
PUBLIC_WEBSOCKET_URL=wss://arelorian.de/ws
VITE_API_URL=https://arelorian.de
VITE_WS_URL=wss://arelorian.de
ALLOW_GUEST_LOGIN=1
ALLOW_DEV_LOGIN=1
USE_SUPABASE_WS_LOGIN=0
REQUIRE_SUPABASE_AUTH=0
PERSISTENCE_DRIVER=file
EOF

# Build client
echo "[7/8] Building client..."
cd "$GAME_DIR/client"
pnpm build

# Setup PM2
echo "[8/8] Configuring PM2...
cd "$GAME_DIR"
pm2 delete areloria 2>/dev/null || true
pm2 start deploy/pm2.config.cjs
pm2 save
pm2 startup

# Nginx configuration
cat > /etc/nginx/sites-available/arelorian << 'EOF'
server {
    listen 80;
    server_name arelorian.de www.arelorian.de;

    # Client static files
    location / {
        root /opt/areloria/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Health endpoint
    location /health {
        proxy_pass http://localhost:3000;
    }
}
EOF

ln -sf /etc/nginx/sites-available/arelorian /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

echo "=== Setup Complete ==="
echo ""
echo "Start the server:"
echo "  cd $GAME_DIR && pm2 restart areloria"
echo ""
echo "Check status:"
echo "  pm2 status"
echo ""
echo "View logs:"
echo "  pm2 logs areloria"