FROM node:22-slim

# Install git (needed for pagu-db repo operations)
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY app/package.json app/
COPY server/package.json server/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build frontend (Vite embeds VITE_* vars at build time)
ARG VITE_INSTANT_APP_ID
ENV VITE_INSTANT_APP_ID=$VITE_INSTANT_APP_ID
RUN pnpm --filter app build

# Start script: clone pagu-db if not present, then start server
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 10000

CMD ["/app/start.sh"]
