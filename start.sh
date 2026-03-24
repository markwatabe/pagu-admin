#!/bin/bash
set -e

REPO_PATH="${REPO_PATH:-/data/pagu-db}"

# Clone pagu-db on first deploy (Render Disk persists across deploys)
if [ ! -d "$REPO_PATH/.git" ]; then
  echo "Cloning pagu-db into $REPO_PATH..."
  git clone https://github.com/markwatabe/pagu-db.git "$REPO_PATH"
else
  echo "pagu-db already exists at $REPO_PATH, pulling latest..."
  cd "$REPO_PATH" && git pull origin main && cd /app
fi

# Configure git for agent commits
git config --global user.email "pagu-agent@pagu.bot"
git config --global user.name "Pagu Agent"

# Start the server
exec node --import tsx server/src/index.ts
