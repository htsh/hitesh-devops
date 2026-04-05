# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A documentation-first DevOps and operations repository for `hitesh-cloud`, a small self-managed infrastructure footprint. Owner is Hitesh Aidasani, a developer in NYC. The repo contains infrastructure references, operational plans, design documents, and the Infra Monitor application.

## Infrastructure Context

Three VPS nodes connected over Tailscale:
- `vps1` (AlmaLinux, 2c/4GB) — public edge + app hosting, domains: `arlo.dog`, `stagecouch.net`
- `vps2` (Ubuntu, 6c/8GB) — data/ingest/heavy workloads, domain: `hitesh.nyc`
- `vps3` (Ubuntu, 2c/2.5GB) — light utility/arbiter, domain: `hitesh.cc`

Shared services: Caddy (vps1, vps2), MongoDB standalone on all 3 nodes, Redis (vps1, vps2), PM2 for Node apps (vps1, vps2, vps3).

### Deployed Services

- **vps1**: Stagecouch API (`api.stagecouch.net`, FastAPI), Character Playground (`characters.stagecouch.net`, FastAPI + SvelteKit)
- **vps2**: Bible API (`bible.hitesh.nyc`, Sinatra/Puma), PostgreSQL (installed, no consumers yet)
- **vps3**: Infra Monitor (Tailscale-only `:3100`)
- **debian** (local): OpenViking LLM gateway (Tailscale `:1933`, Docker + llama.cpp)

### Current Priorities

1. **consolidated-york** — highest priority project
2. **LMATV / Stagecouch** — active, deployed on vps1
3. **graph-proximity-engine** — active research/development

## Repository Layout

- `apps/monitor/` — Infra Monitor V1 application (see below)
- `docs/infra/` — infrastructure inventory, monitoring research, operational references
- `docs/plans/` — dated design notes and implementation plans (naming: `YYYY-MM-DD-topic-design.md`)
- `docs/superpowers/plans/` — implementation plans broken into buildable steps
- `hermes/` — repo-local context notes for Hermes AI agent sessions (read `hermes/handoff.md` for cross-session context)
- `projects/` — stub directories for future projects (`blog-hitesh-nyc`, `intelligent-artifact`)
- `utils/` — placeholder for shared utilities

## Infra Monitor App (`apps/monitor/`)

Self-hosted monitoring service deployed on `vps3`. Fastify server + React/Vite dashboard, MongoDB for persistence, ntfy for alerts, Tailscale-only access.

### Architecture

- **Server** (`src/server/`): Fastify app on port 3100. Entry point: `src/server/index.ts`
  - `checks/` — check implementations by kind: `http`, `ping`, `tcp`, `redis`, `mongo`, `pm2`, `docker`, `ssh-command`, `heartbeat`. Each exports a runner function. Registry in `checks/registry.ts`, shared types in `checks/types.ts`
  - `checks/runner.ts` — executes a single check, dispatching to the correct check kind
  - `scheduler/loop.ts` — scheduling loop that picks due targets and runs checks
  - `incidents/` — outage detection (`outages.ts`), ntfy notifications (`notifier.ts`), audit logging (`audit.ts`), coordination (`handler.ts`)
  - `db/` — MongoDB client, collections, indexes, seed data
  - `api/` — Fastify route handlers: `health.ts`, `dashboard.ts`, `targets.ts`
  - `config.ts` — env-based config; `config/targets.ts` — YAML target loader
  - `schemas.ts` — Zod schemas for validation; `types.ts` — shared TypeScript types
- **Web** (`src/web/`): React SPA with React Router, Tailwind CSS, Radix UI components
  - Pages: `overview`, `services`, `targets`, `outages`, `target-detail`, `service-detail`, `target-form`
  - `lib/api.ts` — API client for dashboard data
- **Config**: `config/targets.yaml` — seed target definitions (check kinds, intervals, thresholds, SSH execution modes)
- **Execution modes**: `direct` (run from vps3) or `ssh` (SSH into remote node to run check locally)

### Commands (run from `apps/monitor/`)

```bash
npm install              # install dependencies
npm run dev              # server dev mode (tsx watch)
npm run dev:web          # Vite dev server for frontend
npm run build            # production build (Vite + tsc)
npm start                # run production server
npm test                 # run tests (vitest)
npm run test:watch       # run tests in watch mode
```

### Testing

Uses Vitest. Tests are in `apps/monitor/tests/`. Path aliases: `@server` → `src/server/`, `@/*` → `src/web/*`. Run a single test file:

```bash
cd apps/monitor && npx vitest run tests/checks/http.test.ts
```

### Deployment

PM2 on `vps3`, config in `ecosystem.config.cjs`. See `apps/monitor/DEPLOY.md` for full deploy guide including SSH key setup for remote checks.

## Validation Commands

No repo-wide build system. For documentation changes:
- `git status --short` / `git diff --stat` — review changes
- `markdownlint "*.md"` — lint markdown (if installed)

## Writing Conventions

- Markdown with short sections, explicit headings, direct operational language
- `-` bullets, fenced code blocks for commands, inline code for hosts/domains/ports/filenames
- Filenames: lowercase with hyphens (e.g., `external-monitors.md`)
- Include snapshot dates for point-in-time research (e.g., `Snapshot date: 2026-03-19`)

## Other Agents

`AGENTS.md` contains guidelines for non-Claude agents (structure, validation commands, coding style). Content overlaps with this file but is tailored for other tools.

## Commit Style

Short imperative subjects: `add monitor contributor guide`, `update external monitor notes`. PRs should state purpose, list files changed, and link supporting sources when referencing external information.
