#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Function to handle errors
error_exit() {
    echo "Integrity Check Failed: $1" >&2
    exit 1
}

echo "Starting Integrity Check..."

# 1. Check for uncommitted changes that might interfere with the build
if [[ -n $(git status --porcelain) ]]; then
    echo "Warning: Working directory is not clean. This might affect integrity results."
fi

# 2. Check for package-lock.json or yarn.lock consistency
if [ -f "package-lock.json" ]; then
    echo "Verifying package-lock.json..."
    # npm ci returns non-zero if lockfile is out of sync
    npm ci --prefer-offline --no-audit || error_exit "package-lock.json is out of sync with package.json"
elif [ -f "yarn.lock" ]; then
    echo "Verifying yarn.lock..."
    yarn install --frozen-lockfile || error_exit "yarn.lock is out of sync with package.json"
fi

# 3. TypeScript Type Integrity
if [ -f "tsconfig.json" ]; then
    echo "Running TypeScript compiler check..."
    npx tsc --noEmit || error_exit "TypeScript type check failed."
fi

# 4. Check for potential linting regressions (if script exists)
if npm run | grep -q "lint"; then
    echo "Running linter..."
    npm run lint || error_exit "Linting integrity check failed."
fi

# 5. Ensure no files were modified during the check (e.g. auto-generated files not committed)
if [[ -n $(git status --porcelain) ]]; then
    echo "Error: Integrity check modified files in the repository."
    git status --porcelain
    error_exit "Clean state violation."
fi

echo "Integrity Check completed successfully."
exit 0