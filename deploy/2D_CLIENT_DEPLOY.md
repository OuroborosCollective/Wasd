# 2D Client Deployment Config

## Build Output
After building, the 2D client will be at: `/2d/` (base URL)

## Nginx Config for 2D Client

Add this to your nginx config for the 2D client:

```nginx
# 2D Client
location /2d {
    alias /opt/areloria/apps/client-2d/dist;
    index index.html;
    try_files $uri $uri/ /2d/index.html;
}
```

## Full Nginx Config

```nginx
server {
    listen 80;
    server_name arelorian.de www.arelorian.de;
    
    # 3D Client (main)
    location / {
        root /opt/areloria/client/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # 2D Client
    location /2d {
        alias /opt/areloria/apps/client-2d/dist;
        index index.html;
        try_files $uri $uri/ /2d/index.html;
    }
    
    # API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# SSL redirect (if using certbot)
server {
    listen 443 ssl http2;
    server_name arelorian.de www.arelorian.de;
    ssl_certificate /etc/letsencrypt/live/arelorian.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/arelorian.de/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    
    # Same locations as above...
}
```

## Build Commands

```bash
# Clone and build
cd /opt/areloria
pnpm install
pnpm build:2d

# Or just client
cd apps/client-2d
pnpm build
```

## .env for 2D Client

Create `/opt/areloria/.env`:

```env
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
```

## URLs After Deploy

- **3D Client**: https://arelorian.de/
- **2D Client**: https://arelorian.de/2d/
- **WebSocket**: wss://arelorian.de/ws
- **API**: https://arelorian.de/api