# Arelorian VPS Manual Setup
# Run these commands as root on your VPS

# ============================================
# Step 1: Install Dependencies
# ============================================

# Update packages
apt-get update
apt-get install -y curl git nginx certbot python3-certbot-nginx build-essential

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# ============================================
# Step 2: Clone Repository
# ============================================

mkdir -p /opt/areloria
cd /opt/areloria
git clone https://github.com/OuroborosCollective/Wasd.git .

# ============================================
# Step 3: Install & Build
# ============================================

pnpm install --frozen-lockfile
cd client && pnpm build

# ============================================
# Step 4: Create .env
# ============================================

cd /opt/areloria
cat > .env << 'EOF'
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

# ============================================
# Step 5: PM2 Setup
# ============================================

npm install -g pm2
pm2 start deploy/pm2.config.cjs
pm2 save

# ============================================
# Step 6: Nginx Config
# ============================================

cat > /etc/nginx/sites-available/arelorian << 'EOF'
server {
    listen 80;
    server_name arelorian.de www.arelorian.de;

    location / {
        root /opt/areloria/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        proxy_pass http://localhost:3000;
    }
}
EOF

ln -sf /etc/nginx/sites-available/arelorian /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# ============================================
# Step 7: Start Server
# ============================================

cd /opt/areloria
pm2 restart all

# ============================================
# DONE!
# ============================================

echo "Access your game at: https://arelorian.de"
echo "Check server status: pm2 status"
echo "View logs: pm2 logs"