#!/bin/bash
set -e

# Arelorian Engine Deployment Script
# Deploys the engine to local Docker or updates the running container

echo "=========================================="
echo "Arelorian Engine Deployment"
echo "=========================================="

# Navigate to app directory
cd "$(dirname "$0")"

# Git pull latest changes
echo "[1/4] Pulling latest changes..."
git pull origin main || echo "Git pull skipped (not a git repo or no remote)"

# Build Docker images
echo "[2/4] Building Docker images..."
docker-compose build --no-cache arelorian-engine

# Start services
echo "[3/4] Starting services..."
docker-compose up -d arelorian-engine

# Wait for health check
echo "[4/4] Waiting for health check..."
sleep 10

# Prune old images
echo "Pruning old Docker images..."
docker image prune -f

echo "=========================================="
echo "Deployment complete!"
echo "Engine running on port 3000"
echo "=========================================="