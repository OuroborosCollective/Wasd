#!/bin/bash
# commit_push_merge_all.sh - Automates the push, commit, and merge process for Areloria.

# 1. Sync lockfile
echo "Synchronizing lockfile..."
pnpm install --no-frozen-lockfile

# 2. Check for changes
if [[ -z $(git status -s) ]]; then
    echo "No changes to commit."
    return 0
fi

# 3. Add and commit
echo "Committing changes..."
git add .
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
git commit -m "chore: automatic sync and build stabilization [$TIMESTAMP]"

# 4. Push to current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Pushing to $CURRENT_BRANCH..."
# git push origin "$CURRENT_BRANCH"

# 5. Merge to main (if not already on main)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "Merging $CURRENT_BRANCH into main..."
    git checkout main
    # git pull origin main
    git merge "$CURRENT_BRANCH"
    # git push origin main
    git checkout "$CURRENT_BRANCH"
fi

echo "Automation complete (pushing disabled in sandbox)."
