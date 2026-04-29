#!/bin/bash
set -e

# NodeSource Repo für Node 20.x (Idempotent)
if ! [ -f /etc/apt/sources.list.d/nodesource.list ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
fi

# Pakete installieren
sudo apt-get update
sudo apt-get install -y nodejs build-essential nginx ufw

# PM2 global installieren
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# UFW Regeln setzen
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
echo "y" | sudo ufw enable

# Nginx Konfigurationsdatei erstellen
NGINX_CONF="/etc/nginx/sites-available/wasd-areloria"
cat <<EOF | sudo tee $NGINX_CONF
server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Site via Symlink aktivieren
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/

# Default-Site entfernen, falls vorhanden
if [ -f /etc/nginx/sites-enabled/default ]; then
    sudo rm /etc/nginx/sites-enabled/default
fi

# Konfiguration testen und Nginx neu laden
sudo nginx -t
sudo systemctl reload nginx