#!/bin/bash

set -e

# Configuration
PROJECT_DIR="$(pwd)"
HEALTH_URL="http://localhost:3000/health"
MAX_RETRIES=12
RETRY_INTERVAL=10

echo ">>> Starting Deployment"

cd "$PROJECT_DIR"

# Store current state for rollback
PREVIOUS_COMMIT=$(git rev-parse HEAD)

echo ">>> Fetching latest changes from main"
git pull origin main

echo ">>> Building images"
if ! docker-compose build --pull; then
    echo "Error: Docker build failed"
    exit 1
fi

echo ">>> Starting containers"
if ! docker-compose up -d --remove-orphans; then
    echo "Error: Failed to start containers"
    exit 1
fi

echo ">>> Performing Health Check at $HEALTH_URL"
SUCCESS=0
for i in $(seq 1 $MAX_RETRIES); do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")
    
    if [ "$HTTP_STATUS" -eq 200 ]; then
        echo ">>> Health Check Passed!"
        SUCCESS=1
        break
    fi
    
    echo ">>> Attempt $i/$MAX_RETRIES: Service returned $HTTP_STATUS. Retrying in ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
done

if [ $SUCCESS -ne 1 ]; then
    echo ">>> Health Check Failed. Initiating Rollback to $PREVIOUS_COMMIT..."
    
    git checkout "$PREVIOUS_COMMIT"
    docker-compose build
    docker-compose up -d --remove-orphans
    
    echo ">>> Rollback Complete. Deployment Failed."
    exit 1
fi

echo ">>> Deployment successfully completed"