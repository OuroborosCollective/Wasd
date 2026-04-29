#!/bin/bash

# Ensure we are in a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
  echo "Error: Not a git repository."
  exit 1
fi

# Set local user identity if not already set or override
GIT_NAME=${GIT_USER_NAME:-"Developer"}
GIT_EMAIL=${GIT_USER_EMAIL:-"dev@example.com"}

git config --local user.name "$GIT_NAME"
git config --local user.email "$GIT_EMAIL"

# Configure Credential Helper to avoid repeated auth prompts
# 'store' saves credentials in plain text in ~/.git-credentials
# 'cache' keeps them in memory for a short time
git config --local credential.helper store

# Optimization for large tree operations and large file transfers
# Increase the buffer size for HTTP POST operations (e.g., 500MB)
git config --local http.postBuffer 524288000

# Disable compression for large binary deltas if necessary
git config --local core.compression 0

# Increase timeouts for slow connections/large operations
git config --local http.lowSpeedLimit 0
git config --local http.lowSpeedTime 999999

# Fix possible RPC failure on large pushes
git config --local http.version HTTP/1.1

echo "Git local configuration updated:"
echo "User: $(git config user.name) <$(git config user.email)>"
echo "PostBuffer: $(git config http.postBuffer)"
echo "Credential Helper: $(git config credential.helper)"