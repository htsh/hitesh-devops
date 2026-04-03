# hitesh-devops

Operations hub for **hitesh-cloud** — my self-managed infrastructure, deployed services, monitoring, and project planning.

I'm Hitesh Aidasani, a developer in NYC. This repo is the umbrella for everything around my systems: infrastructure inventory, operational plans, runbooks, deployed apps, and utilities.

---

## Infrastructure

Three VPS nodes connected over [Tailscale](https://tailscale.com), plus local machines for dev and LLM inference.

### Cloud Nodes (hitesh-cloud)

| Node | OS | Specs | Role | Domains |
|------|----|-------|------|---------|
| **vps1** | AlmaLinux | 2c / 4GB / 70GB NVMe | Public edge + app hosting | `arlo.dog`, `stagecouch.net` |
| **vps2** | Ubuntu | 6c / 8GB / 120GB SSD | Data, ingest, heavy workloads | `hitesh.nyc` |
| **vps3** | Ubuntu | 2c / 2.5GB / 40GB SSD | Internal ops + monitoring | `hitesh.cc` |

**Shared platform:** Caddy (vps1, vps2) · MongoDB standalone on all 3 nodes · Redis (vps1, vps2) · PM2 for process management (vps1, vps2, vps3)

All inter-node traffic runs over Tailscale. Public services are fronted through Caddy on the edge node.

### Local Machines

| Machine | Hardware | Role |
|---------|----------|------|
| **MacBook Air M3 15"** | 16GB / 256GB | Primary dev + coordination |
| **MacBook Air M1** | 16GB / 1TB | Secondary dev, Apple overflow |
| **babyblue** | AMD 5800X3D, RTX 3090 Ti (24GB VRAM), 32GB | Local LLM inference (large models) |
| **debian** (Razer Blade) | i7-12th, RTX 3080 Ti Mobile (16GB VRAM), 8TB RAID | Always-on server, storage, medium LLM inference |
| **ThinkPad X1 Nano** | Fedora | Webdev + writing |

Both `babyblue` and `debian` are located in Harlem, NYC on a 1Gbps Fios connection. `debian` runs 24/7; `babyblue` sleeps when not in use.

---

## Deployed Services

### vps1 — Public Edge

**Stagecouch API** · `api.stagecouch.net`
- FastAPI backend for Stagecouch (repo: `htsh/LMATV`)
- PM2 process `lmatv-api` on `127.0.0.1:8000`
- MongoDB on vps2, API key auth

**Character Playground** · `characters.stagecouch.net`
- FastAPI backend + SvelteKit frontend (repo: `htsh/character-playground`)
- PM2 processes: `character-playground-api` (:8010) + `character-playground-web` (:3000)
- MongoDB on vps2, OpenRouter for LLM features

### vps2 — Data + Services

**Bible API** · `bible.hitesh.nyc`
- Sinatra/Puma Ruby app (upstream: `seven1m/bible_api`)
- PM2 process `bible-api` on `127.0.0.1:5000`
- MariaDB (`bible_api` database), Redis

**PostgreSQL** — installed, no consumers documented yet

### vps3 — Internal Ops

**Infra Monitor** · Tailscale-only on `:3100`
- Self-hosted monitoring for the entire hitesh-cloud footprint
- See [apps/monitor/](#infra-monitor) below

### Local (debian)

**OpenViking** · Tailscale-accessible on `:1933`
- LLM API gateway running in Docker at `~/projects/openviking`
- Backed by Ollama on the host (RTX 3080 Ti)

---

## Infra Monitor

The main application in this repo. A self-hosted monitoring service that watches all hitesh-cloud infrastructure from vps3.

**Stack:** TypeScript · Fastify · React · Vite · Tailwind · MongoDB · ntfy

**What it monitors (17 seed targets):**
- 4 public endpoints (arlo.dog, stagecouch.net, hitesh.nyc, hitesh.cc)
- 3 host reachability checks (vps1, vps2, vps3 over Tailscale)
- 2 Caddy instances (vps1, vps2)
- 3 MongoDB instances (all nodes)
- 2 Redis instances (vps1, vps2)
- 2 PM2 runtimes (vps1, vps2)

**How it works:**
- Scheduler loop runs every 10 seconds, picks due targets, dispatches checks
- **Direct checks** (HTTP, TCP, ping) run from vps3
- **SSH checks** (PM2, Redis, Mongo, Docker) SSH into vps1/vps2 over Tailscale to run locally
- Outage detection with configurable failure/recovery thresholds
- ntfy notifications on state transitions (down + recovery)
- Correlated failure detection for SSH-based checks on the same node
- React dashboard with overview, services, targets, outages, and CRUD for basic targets
- Advanced targets (config-managed in YAML) are read-only in the dashboard

**Quick start:**
```bash
cd apps/monitor
npm install
npm test           # vitest
npm run dev        # server (tsx watch)
npm run dev:web    # frontend (vite)
npm run build      # production build
```

See [apps/monitor/DEPLOY.md](apps/monitor/DEPLOY.md) for full deployment guide.

---

## Domains

| Domain | Points To | Status |
|--------|-----------|--------|
| `stagecouch.net` | vps1 | Active |
| `arlo.dog` | vps1 | Active (expires ~April 2026, renewal undecided) |
| `hitesh.nyc` | vps2 | Active |
| `hitesh.cc` | vps3 | Active |
| `intelligentartifact.com` | vps2 | Reserved |
| `blog.hitesh.nyc` | vps2 | Planned |

---

## Repository Layout

```
apps/
  monitor/              Infra Monitor — Fastify + React monitoring app
docs/
  infra/                Infrastructure inventory, service manifest, monitoring research
  plans/                Dated design documents and implementation plans
  superpowers/plans/    Step-by-step implementation plans for agentic execution
projects/
  blog-hitesh-nyc/      Planned Ghost blog at blog.hitesh.nyc
  intelligent-artifact/ Planned project at intelligentartifact.com
utils/
  mongo-scripts/        Python CLI for MongoDB backups (ncurses UI, mongodump)
  mongo-utils/          Node.js tool for one-way database sync between Mongo instances
hermes/                 Cross-session context notes for Hermes AI agent
```

---

## Current Priorities

1. **consolidated-york** — highest priority project
2. **LMATV / Stagecouch** — active, deployed on vps1
3. **graph-proximity-engine** — active research/development

Also active: `redwood` (helping a friend deploy), `gmail-cleaner` (ongoing maintenance)

---

## Planned Work

- **Infra Monitor deployment** — v1 ready for PM2 deploy to vps3 ([design](docs/plans/2026-03-19-monitor-design.md) approved)
- **External monitoring** — add UptimeRobot or Better Stack to watch vps3 from outside ([research](docs/infra/external-monitors.md))
- **Gmail alerts service** — notify on high-priority emails from trusted senders via ntfy, later SMS ([notes](hermes/handoff.md))
- **blog.hitesh.nyc** — Ghost CMS on vps2
- **intelligentartifact.com** — TBD on vps2

---

## Key References

| Document | What it covers |
|----------|---------------|
| [docs/infra/infra.md](docs/infra/infra.md) | Full infrastructure inventory and placement guide |
| [docs/infra/service-manifest.md](docs/infra/service-manifest.md) | Every deployed service with ports, Caddy config, verification commands |
| [docs/plans/2026-03-19-monitor-design.md](docs/plans/2026-03-19-monitor-design.md) | Infra Monitor V1 design (approved) |
| [apps/monitor/DEPLOY.md](apps/monitor/DEPLOY.md) | Monitor deployment guide |
| [hermes/handoff.md](hermes/handoff.md) | Cross-session agent context (Gmail alerts, iMessage project, infra notes) |
| [hermes/machines-and-priorities.md](hermes/machines-and-priorities.md) | Machine fleet and project priorities |
