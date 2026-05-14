#!/usr/bin/env python3
"""
Arelorian VPS Quick Deploy via Paramiko
"""

import paramiko
import sys

HOST = "46.202.154.25"
PORT = 22
USER = "root"
PASSWORD = "++2N00py123+++"

# All setup commands in one script
SETUP = r'''
# Install deps
apt-get update -qq
apt-get install -y -qq curl git nginx build-essential nodejs npm

# Install pnpm/pm2  
npm install -g pnpm pm2 2>/dev/null

# Setup app
mkdir -p /opt/areloria
cd /opt/areloria
git clone https://github.com/OuroborosCollective/Wasd.git . || (git fetch origin main && git checkout main)
pnpm install --frozen-lockfile
cd client && pnpm build

# Create .env
cat > /opt/areloria/.env << 'EOF'
NODE_ENV=production
PORT=3000
PUBLIC_WEBSOCKET_URL=wss://arelorian.de/ws
VITE_API_URL=https://arelorian.de
ALLOW_GUEST_LOGIN=1
USE_SUPABASE_WS_LOGIN=0
PERSISTENCE_DRIVER=file
EOF

# Nginx
cat > /etc/nginx/sites-available/arelorian << 'EOF'
server {
    listen 80;
    server_name arelorian.de;
    root /opt/areloria/client/dist;
    index index.html;
    try_files $uri $uri/ /index.html;
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOF
ln -sf /etc/nginx/sites-available/arelorian /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# PM2
pm2 start /opt/areloria/deploy/pm2.config.cjs
pm2 save

echo "DONE"
'''

print(f"Connecting to {HOST}...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    client.connect(HOST, port=PORT, username=USER, password=PASSWORD, timeout=60, banner_timeout=60)
    print("✓ Connected!")
    
    print("Running setup (this may take a few minutes)...")
    stdin, stdout, stderr = client.exec_command(SETUP, get_pty=True)
    
    # Stream output
    while True:
        if stdout.channel.recv_ready():
            line = stdout.readline()
            if line:
                print(line, end="")
        if stderr.channel.recv_ready():
            err = stderr.readline()
            if err:
                print(f"ERR: {err}", end="")
        if stdout.channel.exit_status_ready():
            break
    
    exit_code = stdout.channel.recv_exit_status()
    print(f"\nExit code: {exit_code}")
    
    if exit_code == 0:
        print("\n✅ VPS Ready!")
        print("Access: https://arelorian.de")
    else:
        print(f"⚠️ Exit code: {exit_code}")
        
except paramiko.AuthenticationException:
    print("❌ Auth failed")
    sys.exit(1)
except Exception as e:
    print(f"❌ {e}")
    sys.exit(1)
finally:
    client.close()