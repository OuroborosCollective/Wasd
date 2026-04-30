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

echo ">>> Pulling and building images"
if ! docker-compose pull && docker-compose build; then
    echo "Error: Docker build failed"
    exit 1
fi

echo ">>> Running database migrations"
# Run migrations in a temporary container before updating the main services
if ! docker-compose run --rm app npm run migrate; then
    echo "Error: Migrations failed. Aborting deployment."
    git checkout "$PREVIOUS_COMMIT"
    exit 1
fi

echo ">>> Starting updated containers"
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
    
    # Optional: Re-run migrations for previous state if your system supports down-migrations
    # docker-compose run --rm app npm run migrate:rollback

    echo ">>> Rollback Complete. Deployment Failed."
    exit 1
fi

echo ">>> Invalidating application cache"
# Execute cache clear in the running environment
if ! docker-compose exec -T app npm run cache:clear; then
    echo "Warning: Cache invalidation failed. Manual check recommended."
else
    echo ">>> Cache successfully invalidated"
fi

echo ">>> Pruning old Docker resources"
docker image prune -f

echo ">>> Deployment successfully completed"