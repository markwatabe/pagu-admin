# Cloudflare Workers + AI Agent System Design

**Date:** 2026-03-24
**Status:** Draft

## Overview

Migrate pagu-admin to Cloudflare Workers and add an AI agent system that helps dashboard users create and manage restaurant content. Agents interact with the `pagu-db` GitHub repo (ingredient data) via the GitHub Contents API, using Claude for reasoning.

## Architecture

```
┌─────────────────────────────────────────────┐
│  React Frontend (Cloudflare Workers Assets)  │
│  - Dashboard pages (existing)                │
│  - Chat panel (new)                          │
└──────────────┬──────────────────────────────┘
               │ fetch /api/*
┌──────────────▼──────────────────────────────┐
│  Hono on Cloudflare Worker                   │
│  - Ingredient API (GitHub API backend)       │
│  - Chat API (streams agent responses)        │
│  - Cron handler (background agents)          │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│ GitHub API   │  │ Claude API  │
│ (pagu-db)    │  │ (reasoning) │
└─────────────┘  └─────────────┘
```

- Hono Worker handles all API routes and serves the React SPA as static assets
- GitHub Contents API replaces filesystem reads/writes for ingredient data
- Claude API provides agent intelligence
- Cloudflare Cron Triggers handle scheduled background agents
- Data repo: https://github.com/markwatabe/pagu-db (private)

## Migration: Hono Server to Cloudflare Worker

Three changes to the existing server:

### 1. Replace Node.js server with Worker export

Instead of `@hono/node-server` with `serve(app)`, export a standard Worker `fetch` handler. Hono's routing API stays identical.

### 2. Replace filesystem calls with GitHub API

The ingredient routes currently use `fs.readdir` and `fs.readFile` on `REPO_PATH/ingredients/`. These become GitHub Contents API calls:

- `GET /repos/markwatabe/pagu-db/contents/ingredients` — list files
- `GET /repos/markwatabe/pagu-db/contents/ingredients/{id}.json` — read file
- `PUT /repos/markwatabe/pagu-db/contents/ingredients/{id}.json` — create/update file (commits)

### 3. Add wrangler config

Define the Worker, static assets, secrets, and cron triggers.

**Secrets (stored in Cloudflare, `.dev.vars` locally):**
- `GITHUB_TOKEN` — PAT with repo access to pagu-db
- `ANTHROPIC_API_KEY` — for Claude API calls

**Build-time env vars (in wrangler config or `.env`):**
- `VITE_INSTANT_APP_ID` — InstantDB app ID, bundled into frontend at build time

### 4. Collapse monorepo into single Wrangler project

The current `app/` + `server/` workspace split collapses into a single Wrangler project. The Worker entry point imports Hono routes; Vite builds the React app as static assets served by the same Worker. The `pnpm-workspace.yaml` and separate `package.json` files are no longer needed.

### 5. Sub-ingredient resolution

The current `GET /api/ingredients/:id` resolves sub-ingredient names by reading additional JSON files. With GitHub API, each sub-ingredient is a separate HTTP call. To avoid N+1 requests, the directory listing from `GET /repos/.../contents/ingredients` is cached in-memory per request (or in KV for background jobs) and used to batch-resolve names.

## Agent System

### Chat Agent (interactive)

- New `POST /api/chat` endpoint on the Hono Worker, protected by the same InstantDB auth used by the frontend (verify token on each request)
- User sends a message, Worker calls Claude API with tools, streams response back via Server-Sent Events
- Agent tools:
  - `list_ingredients` — lists files in pagu-db via GitHub API
  - `read_ingredient` — reads a specific ingredient JSON file
  - `write_ingredient` — creates or updates an ingredient file (commits to pagu-db)

### Background Agents (scheduled)

- Cloudflare Cron Triggers invoke the Worker on a schedule
- v1: daily validation job that checks all ingredient files have required fields
- Future: weekly seasonal ingredient suggestions, bulk recipe description generation
- Background agents commit directly to pagu-db
- Run results stored in Cloudflare KV for the dashboard to display

### 30s CPU Limit Strategy

Most agent interactions (read a file, generate content, write back) should complete within 30s. If we hit the limit in the future, we split into Durable Objects — not needed for v1.

## Frontend Changes

### Chat Panel

- Sliding sidebar or modal, accessible from any dashboard page
- Simple message list + text input
- Streams agent responses via SSE (EventSource)
- Shows tool use indicators when the agent reads/writes files

### Background Agent Status

- Section on the dashboard showing recent background agent runs
- Each run shows: timestamp, action taken, link to commit on GitHub

### Existing Pages

No changes. The ingredient API returns the same response shape, just sourced from GitHub instead of the local filesystem.

## Local Development

- `pnpm wrangler dev` replaces the current `concurrently` setup (Vite + Node server)
- `@cloudflare/vite-plugin` provides HMR for the React frontend through the Workers runtime
- Secrets stored in `.dev.vars` (gitignored)
- GitHub API calls work locally (just HTTP)

## v1 Scope

### In scope
- Migrate Hono server to Cloudflare Worker
- Swap filesystem ingredient API to GitHub Contents API
- Deploy React frontend as Worker static assets
- Chat endpoint with Claude + 3 tools (list, read, write ingredients)
- Chat panel in the frontend
- One background cron job (validate ingredient files daily)
- `@cloudflare/vite-plugin` for local dev

### Out of scope (future)
- Durable Objects for long-running agents
- Menu/layout content types for agents
- PR-based workflow (agents commit directly for now)
- Agent memory/conversation history persistence
- Multiple agent personas
