#!/bin/bash

# Deployment script for Wasd application
# secure and improved version

set -e  # Exit immediately if a command exits with a non-zero status.

# Function to log messages
log() {
    echo "$(date +"%Y-%m-%d %H:%M:%S") - $1"
}

# Check if required environment variables are set
if [[ -z "$DEPLOY_ENV" || -z "$APP_DIR" || -z "$SERVER_USER" || -z "$SERVER" ]]; then
    log "Error: Required environment variables are not set."
    exit 1
fi

# Function to deploy application
deploy() {
    log "Starting deployment to $DEPLOY_ENV on $SERVER..."

    # Navigate to application directory
    cd "$APP_DIR" || { log "Error: Unable to access app directory."; exit 1; }

    # Pull latest code
    log "Pulling latest code..."
    git pull origin main

    # Install dependencies
    log "Installing dependencies..."
    npm install --production

    # Build application (if applicable)
    log "Building application..."
    npm run build || { log "Error: Build failed."; exit 1; }

    # Restart service (using appropriate command for your service manager)
    log "Restarting service..."
    ssh "$SERVER_USER@$SERVER" "sudo systemctl restart wasd-app"

    log "Deployment completed successfully."
}

# Start deployment
deploy() {
    log "Starting deployment to $DEPLOY_ENV on $SERVER..."

    # Navigate to application directory
    cd "$APP_DIR" || { log "Error: Unable to access app directory."; exit 1; }

    # Pull latest code
    log "Pulling latest code..."
    git pull origin main

    # Install dependencies
    log "Installing dependencies..."
    npm install --production

    # Build application (if applicable)
    log "Building application..."
    npm run build || { log "Error: Build failed."; exit 1; }

    # Restart service (using appropriate command for your service manager)
    log "Restarting service..."
    ssh "$SERVER_USER@$SERVER" "sudo systemctl restart wasd-app"

    log "Deployment completed successfully."
}

# Start deployment
deploy
