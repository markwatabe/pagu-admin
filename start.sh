#!/bin/bash
set -e

REPO_PATH="${REPO_PATH:-/data/pagu-db}"

# Initialize pagu-db on first deploy (Render Disk persists across deploys)
if [ ! -d "$REPO_PATH/.git" ]; then
  echo "Initializing pagu-db at $REPO_PATH..."
  mkdir -p "$REPO_PATH/ingredients"

  # Seed with bundled ingredient data if available
  if [ -d "/app/seed-data/ingredients" ]; then
    cp /app/seed-data/ingredients/*.json "$REPO_PATH/ingredients/" 2>/dev/null || true
    echo "Seeded ingredients from bundled data"
  fi

  cd "$REPO_PATH"
  git init
  git add -A
  git commit -m "Initial commit: seed ingredient data" || true
  cd /app
else
  echo "pagu-db already exists at $REPO_PATH"
fi

# Configure git for agent commits
git config --global user.email "pagu-agent@pagu.bot"
git config --global user.name "Pagu Agent"

# Start the server
exec node --import tsx server/src/index.ts
