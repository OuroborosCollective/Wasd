#!/bin/bash

# Deployment script for VPS
# Usage: ./scripts/deploy.sh

set -e

echo "Starting deployment..."

# Load environment variables if .env exists
if [ -f .env ]; then
    export $(cat .env | grep -v '#' | xargs)
fi

# Pull the latest images from the registry
echo "Pulling latest images..."
docker-compose pull

# Start or update services
echo "Applying changes with docker-compose..."
docker-compose up -d --remove-orphans

# Clean up unused images to save disk space
echo "Cleaning up old images..."
docker image prune -f

echo "Deployment finished successfully."