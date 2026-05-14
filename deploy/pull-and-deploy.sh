#!/bin/bash
set -e

# Navigate to project root relative to script location
cd "$(dirname "$0")/.."

echo "Pulling latest changes..."
git pull origin $(git rev-parse --abbrev-ref HEAD)

echo "Build, asset sync, and PM2 (Wasd server + client)..."
bash deploy/vps-prod-build.sh

echo "Deployment finished successfully."