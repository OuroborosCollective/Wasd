#!/bin/bash
# ============================================================
# Areloria MMORPG – GitHub Sync Script
# Synchronisiert alle 2 Stunden mit GitHub (Pull & Push)
# ============================================================

APP_DIR="/home/ubuntu/Wasd"
LOG_FILE="/home/ubuntu/.logs/state-sync/git-sync.log"

# Erstelle Log-Verzeichnis falls nicht vorhanden
mkdir -p "$(dirname "$LOG_FILE")"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting GitHub sync..." >> "$LOG_FILE"

cd "$APP_DIR" || { echo "Error: Could not cd to $APP_DIR" >> "$LOG_FILE"; exit 1; }

# 1. Pull latest changes from GitHub
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Pulling from origin main..." >> "$LOG_FILE"
git pull origin main >> "$LOG_FILE" 2>&1

# 2. Check for local changes to push
if [[ -n $(git status -s) ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Local changes detected. Pushing to GitHub..." >> "$LOG_FILE"
    git add .
    git commit -m "chore: auto-sync from VPS [$(date '+%Y-%m-%d %H:%M:%S')]" >> "$LOG_FILE" 2>&1
    git push origin main >> "$LOG_FILE" 2>&1
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] No local changes to push." >> "$LOG_FILE"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sync complete." >> "$LOG_FILE"
echo "------------------------------------------------------" >> "$LOG_FILE"
