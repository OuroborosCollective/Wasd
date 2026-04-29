#!/bin/bash
set -e

# Navigate to project root relative to script location
cd "$(dirname "$0")/.."

echo "Pulling latest changes..."
git pull origin $(git rev-parse --abbrev-ref HEAD)

echo "Installing dependencies..."
pnpm install --frozen-lockfile

echo "Running build process..."
pnpm run build

echo "Restarting application..."
if command -v pm2 &> /dev/null
then
    pm2 reload all --update-env
    echo "PM2 processes reloaded successfully."
else
    echo "PM2 not found. Attempting to restart via npm/pnpm start..."
    pnpm start
fi

echo "Deployment finished successfully."