# Project inventory snapshot

Generated: 2026-03-24
Source scanned: `~/Code`

This is a lightweight inventory of repositories and project folders visible under `~/Code`, with a bias toward helping future Hermes agents quickly identify what looks active now.

## Probably active now

Ranked by a simple heuristic: recent commits, uncommitted changes, and signs of active agent-facing docs.

1. `consolidated-york`
   - Last commit: 2026-03-24
   - Branch: `main`
   - Dirty: yes
   - Notes: likely tied to York repo consolidation / subtree work

2. `graph-proximity-engine`
   - Last commit: 2026-03-23
   - Branch: `main`
   - Stack: Python
   - Dirty: yes

3. `LMATV`
   - Last commit: 2026-03-24
   - Branch: `main`
   - Dirty: yes

4. `redwood`
   - Last commit: 2026-03-22
   - Branch: `hitesh-evals`
   - Stack: Node/JS, TypeScript
   - Dirty: yes

5. `HackerNewsTV`
   - Last commit: 2026-03-21
   - Branch: `main`
   - Stack: Node/JS, TypeScript
   - Dirty: yes

6. `SkyWatch`
   - Last commit: 2026-03-21
   - Branch: `main`
   - Stack: Node/JS, TypeScript
   - Dirty: yes

7. `gmail-cleaner`
   - Last commit: 2026-03-24
   - Branch: `main`
   - Stack: Python
   - Dirty: no
   - Notes: Hermes/Gmail integration context likely relevant

8. `hitesh-devops`
   - Last commit: 2026-03-24
   - Branch: `main`
   - Dirty: no
   - Notes: canonical infra notes repo

9. `content-engine`
   - Last commit: 2026-03-21
   - Branch: `main`
   - Dirty: no

10. `jekyll-theme-chirpy`
    - Last commit: 2026-03-16
    - Branch: `techie`
    - Stack: Node/JS, Ruby
    - Dirty: yes

## Functional grouping

### Infra / tools / agent workflow
- `hitesh-devops`
- `hitesh-utils`
- `my-skills`
- `full-stack-starter`
- `consolidated-york`

### Email / scraping / automation
- `gmail-cleaner`
- `reddit-scraper`
- `bluesky-links`
- `archive/bluesky-experiments`

### Content / publishing / themes
- `content-engine`
- `ghost-theme`
- `jekyll-theme-chirpy`
- `archive/quartz`
- `video-maker`

### AI / research / experimentation
- `assessment-research`
- `graph-proximity-engine`
- `character-playground`
- `vision-playground`
- `archive/vision`
- `archive/ink-ai`

### Apps / products / prototypes
- `HackerNewsTV`
- `LadderMatch`
- `LMATV`
- `SkyWatch`
- `cleartheblock`
- `redwood`
- `dog-roast`
- `bible_api`
- `jobs`

### Games
- `Games/2d-platformer-controller`
- `Games/2d-platformer---starter-kit`
- `Games/godot-3d-multiplayer-template`
- `Games/orc-clash`
- `Games/side-scroller-mono`

## Repo inventory

### Top-level `~/Code`
- `assessment-research` — Python
- `bible_api` — Ruby, PM2
- `bluesky-links` — Node/JS, TypeScript
- `character-playground` — PM2-oriented app/workflow
- `cleartheblock` — Node/JS
- `consolidated-york` — repo consolidation/worktree docs; stack unclear from root markers
- `content-engine` — stack unclear from root markers
- `dog-roast` — stack unclear from root markers
- `full-stack-starter` — docker-compose present
- `ghost-theme` — Node/JS
- `gmail-cleaner` — Python
- `graph-proximity-engine` — Python
- `HackerNewsTV` — Node/JS, TypeScript
- `hitesh-devops` — infra/docs repo
- `hitesh-utils` — utilities repo
- `jekyll-theme-chirpy` — Node/JS, Ruby
- `jobs` — repo exists; unusual git state, worth inspecting manually before use
- `LadderMatch` — Node/JS, TypeScript
- `LMATV` — stack unclear from root markers
- `my-skills` — skills/docs repo
- `reddit-scraper` — stack unclear from root markers
- `redwood` — Node/JS, TypeScript
- `SkyWatch` — Node/JS, TypeScript
- `video-maker` — stack unclear from root markers
- `vision-playground` — stack unclear from root markers

### Under `~/Code/archive`
- `bluesky-experiments`
- `ink-ai`
- `quartz` — Node/JS, TypeScript
- `vision` — Node/JS, TypeScript

### Under `~/Code/Games`
- `2d-platformer-controller` — Godot
- `2d-platformer---starter-kit` — Godot
- `godot-3d-multiplayer-template` — Godot
- `orc-clash` — Godot
- `side-scroller-mono`

## Notable signals / cautions

- Several repos have `CLAUDE.md`, which strongly suggests active AI-assisted development workflows.
- Repos with especially fresh activity during this scan window include:
  - `consolidated-york`
  - `graph-proximity-engine`
  - `LMATV`
  - `gmail-cleaner`
  - `hitesh-devops`
- `jobs` has an unusual git state (repo present, dirty, but no normal branch/log surfaced during the scan); inspect before relying on it.
- `dog-roast` and `Games/2d-platformer-controller` appear locally active but do not have remotes configured.

## Suggested next step if another agent needs deeper context

For the most actionable current-context review, inspect in this order:
1. `hitesh-devops`
2. `gmail-cleaner`
3. `consolidated-york`
4. `graph-proximity-engine`
5. `LMATV`
6. `HackerNewsTV`
7. `redwood`
