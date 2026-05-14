## Summary

This PR adds a VPS setup script for deploying Areloria to a production VPS.

### Changes

- `deploy/vps-setup.sh` - Complete setup script that:
  - Installs Node.js 20 and pnpm
  - Clones/updates the repository
  - Creates .env configuration  
  - Builds the client
  - Configures PM2 process manager
  - Sets up Nginx with WebSocket proxy
  - Configures the domain arelorian.de

### Usage

Run on your VPS as root:
```bash
curl -fsSL https://raw.githubusercontent.com/OuroborosCollective/Wasd/main/deploy/vps-setup.sh | bash
```

Or manually:
```bash
chmod +x deploy/vps-setup.sh
./deploy/vps-setup.sh
```

### Manual Setup Steps

1. SSH to your VPS: `ssh root@46.202.154.25`
2. Run the setup script
3. The script will:
   - Install all dependencies
   - Build the client
   - Configure PM2
   - Set up Nginx

4. After setup, start the server:
```bash
cd /opt/areloria
pm2 restart areloria
```

5. Access at: https://arelorian.de