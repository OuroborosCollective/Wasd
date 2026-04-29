#!/bin/bash

# System-Updates durchführen
sudo apt-get update
sudo apt-get upgrade -y

# Notwendige Tools für NodeSource installieren
sudo apt-get install -y ca-certificates curl gnupg

# Node.js 20 LTS Repo hinzufügen und installieren
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 global installieren
sudo npm install -g pm2

# Nginx installieren
sudo apt-get install -y nginx

# UFW-Firewall konfigurieren
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
echo "y" | sudo ufw enable

# Verzeichnis anlegen und Berechtigungen setzen
sudo mkdir -p /var/www/wasd-areloria
sudo chown -R $USER:$USER /var/www/wasd-areloria
sudo chmod -R 755 /var/www/wasd-areloria

exit 0