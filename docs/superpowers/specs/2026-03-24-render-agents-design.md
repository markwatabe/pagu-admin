# Render + AI Agent System Design

**Date:** 2026-03-24
**Status:** Draft
**Supersedes:** 2026-03-24-cloudflare-agents-design.md

## Overview

Deploy pagu-admin to Render with a persistent disk for the pagu-db git repo. Add an AI agent system that helps dashboard users create and manage restaurant content. Agents read/write ingredient files directly on the filesystem and sync changes via git push.

## Architecture

```
┌─────────────────────────────────────────────┐
│  React Frontend (Vite build → static files)  │
│  - Dashboard pages (existing)                │
│  - Chat panel (new)                          │
└──────────────┬──────────────────────────────┘
               │ fetch /api/*
┌──────────────▼──────────────────────────────┐
│  Hono on Node.js (Render Web Service)        │
│  - Ingredient API (filesystem, unchanged)    │
│  - Chat API (streams agent responses)        │
│  - Serves static frontend in production      │
└──────────────┬──────────────────────────────┘
               │ fs read/write
┌──────────────▼──────────────────────────────┐
│  Render Disk (/data/pagu-db)                 │
│  - Git clone of markwatabe/pagu-db           │
│  - ingredients/*.json                        │
│  - Agent writes → git commit + push          │
└─────────────────────────────────────────────┘
```

### Key decisions

- **No database** — InstantDB handles auth/data, filesystem handles ingredients
- **No GitHub API** — direct filesystem access, git for sync
- **No Cloudflare** — Render web service with persistent disk
- **Existing ingredient API unchanged** — same `fs.readFile`/`fs.readdir` calls, just a different `REPO_PATH`
- **Infrastructure as code** — `render.yaml` blueprint defines the service and disk

## Infrastructure (render.yaml)

- **Web service**: Docker, Node 22, starter plan, Ohio region
- **Persistent disk**: 1GB mounted at `/data`, stores the pagu-db git clone
- **Start script**: clones pagu-db on first deploy, pulls on subsequent deploys
- **Environment variables**: `VITE_INSTANT_APP_ID`, `INSTANT_ADMIN_TOKEN`, `ANTHROPIC_API_KEY`, `REPO_PATH=/data/pagu-db`, `PORT=10000`

## Server Changes

- Serve built frontend static files in production via `@hono/node-server/serve-static`
- SPA fallback for client-side routing
- CORS only in development
- Port from `PORT` env var (Render uses 10000)

## Agent System

### Chat Agent (interactive)

- `POST /api/chat` endpoint, protected by InstantDB auth token verification
- Claude API with tools for ingredient CRUD (list, read, write)
- Tools use the same filesystem functions as the existing ingredient API
- Agent writes go through: `fs.writeFile` → `git add` → `git commit` → `git push`
- Responses stream via SSE

### Background Agents (future)

- Can be added later via Render Cron Jobs (separate service type in render.yaml)
- Not in v1 scope

## Frontend Changes

- Chat panel (sliding sidebar) accessible from any dashboard page
- Streams agent responses via SSE with real-time text deltas

## v1 Scope

### In scope
- render.yaml blueprint + Dockerfile + start.sh
- Server serves frontend static files in production
- Chat endpoint with Claude + 3 tools (list, read, write ingredients)
- Agent writes commit + push to pagu-db
- Chat panel in the frontend

### Out of scope (future)
- Background/cron agents
- Menu/layout content types for agents
- Agent memory/conversation history persistence
- Multiple agent personas
