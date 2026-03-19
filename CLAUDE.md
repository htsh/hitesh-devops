# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A documentation-first DevOps and operations repository for `hitesh-cloud`, a small self-managed infrastructure footprint. Owner is Hitesh Aidasani, a developer in NYC. The repo contains infrastructure references, operational plans, design documents, and will eventually include deployment scripts and utilities.

## Infrastructure Context

Three VPS nodes connected over Tailscale:
- `vps1` (AlmaLinux, 2c/4GB) — public edge + app hosting, domains: `arlo.dog`, `stagecouch.net`
- `vps2` (Ubuntu, 6c/8GB) — data/ingest/heavy workloads, domain: `hitesh.nyc`
- `vps3` (Ubuntu, 2c/2.5GB) — light utility/arbiter, domain: `hitesh.cc`

Shared services: Caddy (vps1, vps2), MongoDB replica set rs0 (vps2=PRIMARY, vps1=SECONDARY, vps3=ARBITER), Redis (vps1, vps2), PM2 for Node apps (vps1, vps2).

## Repository Layout

- `docs/infra/` — infrastructure inventory, monitoring research, operational references
- `docs/plans/` — dated design notes and implementation plans (naming: `YYYY-MM-DD-topic-design.md`)
- Root: `README.md`, `AGENTS.md`, `.gitignore`

## Current Active Project

Infra Monitor V1 — a self-hosted monitoring service for `vps3` with Mongo persistence, ntfy alerts, and a Tailscale-only admin dashboard. Design is approved. See:
- `docs/plans/2026-03-19-monitor-design.md` (full spec)
- `docs/plans/2026-03-19-monitor-dashboard-build-design.md` (dashboard design)
- `docs/plans/2026-03-19-monitor-dashboard-implementation-plan.md` (implementation plan)

## Validation Commands

No build system or test runner. Use these for pre-commit checks:
- `git status --short` / `git diff --stat` — review changes
- `markdownlint "*.md"` — lint markdown (if installed)

## Writing Conventions

- Markdown with short sections, explicit headings, direct operational language
- `-` bullets, fenced code blocks for commands, inline code for hosts/domains/ports/filenames
- Filenames: lowercase with hyphens (e.g., `external-monitors.md`)
- Include snapshot dates for point-in-time research (e.g., `Snapshot date: 2026-03-19`)

## Commit Style

Short imperative subjects: `add monitor contributor guide`, `update external monitor notes`. PRs should state purpose, list files changed, and link supporting sources when referencing external information.
