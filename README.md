# hitesh-devops

This is my devops and operations repository.

I am Hitesh Aidasani, a developer in NYC, and I use this repo as an umbrella for the systems around my work: infrastructure notes, operational plans, runbooks, architecture decisions, and eventually business and marketing material tied to my contractor services.

## Current Focus

The current focus is `hitesh-cloud`, my small self-managed infrastructure footprint.

Right now that means three VPS systems connected over Tailscale:

- `vps1` for public edge traffic and app hosting
- `vps2` for data-heavy workloads, ingest, and background processing
- `vps3` for lightweight utility roles and internal operations

The baseline infrastructure reference lives in [docs/infra/infra.md](docs/infra/infra.md).

## Repository Layout

This repo is intentionally documentation-first.

- [README.md](README.md): repo overview and intent
- [AGENTS.md](AGENTS.md): contributor guidance for working in this repository
- [docs/infra/](docs/infra/): infrastructure inventory, hosting notes, monitoring research, and operational references
- [docs/plans/](docs/plans/): dated design notes and implementation plans

Likely future areas:

- business and contractor service material
- marketing copy, blog drafts, and public-facing positioning
- deployment scripts or small utilities in Node or Python as the repo grows

## Starting Points

- [Infrastructure Inventory](docs/infra/infra.md)
- [External Monitor Options](docs/infra/external-monitors.md)
- [Infra Monitor V1 Design](docs/plans/2026-03-19-monitor-design.md)

## Working Intent

I want this repository to stay practical. Documents here should help me answer questions like:

- what infrastructure exists right now
- where a service should live
- what the current operational assumptions are
- what I am planning to build next

As the repository expands, it should remain a clean umbrella for both internal operations and the business layer around my development work.
