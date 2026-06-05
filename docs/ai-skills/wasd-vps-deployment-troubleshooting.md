# VPS Deployment Troubleshooting Guide

## Overview

This guide covers common issues that can occur when deploying Areloria to a VPS and how to diagnose and fix them.

## Common Issues

### 1. 2D Client Shows Blank Page or Unread Page

**Symptoms:**
- Users see a blank or unread page at `https://arelorian.de/2d/`
- Page loads but game assets don't appear

**Root Causes:**

#### a) Missing `2d-assets` Symlink
The client expects game assets at `/2d-assets/` root path, but they are nested inside `/2d/2d-assets/`.

**Check:**
```bash
# SSH to VPS
ssh root@46.202.154.25

# Check if symlink exists
docker exec arelorian-engine ls -la /app/server/client/dist/ | grep 2d
# Should show: lrwxrwxrwx ... 2d-assets -> /app/server/client/dist/2d/2d-assets
```

**Fix in Dockerfile:**
```dockerfile
# Create symlink for 2d-assets to make them accessible at /2d-assets/ root path
RUN ln -s /app/server/client/dist/2d/2d-assets /app/server/client/dist/2d-assets && \
    ln -s /app/client/dist/2d/2d-assets /app/client/dist/2d-assets
```

#### b) Missing PWA Icons
The manifest references icons that don't exist.

**Check:**
```bash
docker exec arelorian-engine ls -la /app/server/client/dist/2d/2d-assets/credits/icon-*.png
```

**Fix:**
Create placeholder icons or ensure they are generated during build.

#### c) Nginx Configuration Conflicts
Multiple Nginx configs with the same `server_name` cause routing issues.

**Check:**
```bash
# Look for conflicting server_name warnings
tail -50 /var/log/nginx/error.log | grep conflicting
```

**Fix:**
Remove duplicate config files. Only one active config per `server_name` should exist:
```bash
# Remove conflicting configs
rm /etc/nginx/conf.d/99-wasd-areloria.conf  # if 00-is already correct
nginx -t && systemctl reload nginx
```

### 2. WebSocket Connection Fails (404 on /ws)

**Symptoms:**
- Client cannot connect to game server
- Console shows WebSocket upgrade failed

**Root Cause:**
- Nginx configuration doesn't properly route WebSocket upgrade requests

**Check:**
```bash
# Direct test (from VPS)
curl -sI http://127.0.0.1:3001/ws
# Should return 404 or upgrade response, NOT proxy 404

# Via HTTPS
curl -sI https://arelorian.de/ws
```

**Fix - Nginx Location:**
```nginx
location ^~ /ws {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $wasd_connection_upgrade;
    proxy_read_timeout 3600;
    proxy_send_timeout 3600;
    proxy_buffering off;
}
```

### 3. Assets Return 404

**Symptoms:**
- CSS/JS files load but game assets return 404
- Console shows failed resource loads

**Check:**
```bash
# Test asset paths
curl -sI https://arelorian.de/2d/assets/index-CHM3UGJI.css  # Should be 200
curl -sI https://arelorian.de/2d-assets/manifest.json        # Should be 200
curl -sI https://arelorian.de/2d-assets/credits/icon-192.png
```

**Common Issues:**
1. Symlink missing (see above)
2. Assets not copied to Docker container during build
3. Wrong base path in manifest.json

## VPS Access Information

- **IP:** 46.202.154.25
- **SSH User:** root
- **Container:** `arelorian-engine` (Docker)
- **Web Server:** Nginx on host
- **Game Port:** 3001 (internal only)

## Useful Commands

### Container Management
```bash
# Check container status
docker ps | grep arelorian-engine

# View container logs
docker logs --tail 100 arelorian-engine

# Restart container
docker restart arelorian-engine

# Access container shell
docker exec -it arelorian-engine sh
```

### Nginx Management
```bash
# Check nginx status
systemctl status nginx

# Test configuration
nginx -t

# Reload configuration
systemctl reload nginx

# View access logs
tail -50 /var/log/nginx/access.log

# View error logs
tail -50 /var/log/nginx/error.log
```

### Asset Verification
```bash
# List all 2d assets
docker exec arelorian-engine find /app/server/client/dist/2d -type f | head -20

# Check specific paths
docker exec arelorian-engine test -f /app/server/client/dist/2d-assets/manifest.json && echo "EXISTS"

# Test HTTP access to assets
curl -sI http://127.0.0.1:3001/2d-assets/manifest.json
```

## Deployment Checklist

Before deploying a new version:

1. **Build Docker image** with symlinks in place
2. **Stop old container** 
3. **Start new container**
4. **Verify symlinks exist** in new container
5. **Test all routes**:
   - `/2d/` - main page
   - `/2d/assets/*.css` - styles
   - `/2d/assets/*.js` - scripts
   - `/2d/manifest.webmanifest` - PWA manifest
   - `/2d-assets/*` - game assets
   - `/ws` - WebSocket endpoint
6. **Check nginx logs** for conflicts or errors
7. **Clear browser cache** and test in incognito mode

## Known Gotchas

### Vite Public Directory Not Copied
When building client-2d, Vite does NOT automatically copy `public/` to `dist/`. The Dockerfile must explicitly copy assets:
```dockerfile
mkdir -p apps/client-2d/dist/assets && \
cp -a apps/client-2d/public/assets/. apps/client-2d/dist/assets/
```

### Symlinks Not Persistent
Symlinks created inside a running container are lost on restart. Always add symlinks to the Dockerfile so they are part of the image.

### Multiple Nginx Server Blocks
Nginx warns about conflicting `server_name` directives. Only one config file should define each domain.

## Related Documentation

- `deploy/ENV_SETUP.md` - Environment variable configuration
- `deploy/.env.production.template` - Production template
- `docs/PROJECT_STATUS_2026.md` - Current project status
