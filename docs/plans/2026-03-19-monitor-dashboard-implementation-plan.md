# Monitor Dashboard Implementation Plan

Date: 2026-03-19

Status: draft implementation plan

Related documents:

- [Monitor Dashboard Build Design](./2026-03-19-monitor-dashboard-build-design.md)
- [Infra Monitor V1 Design](./2026-03-19-monitor-design.md)

## 1. Objective

Build the first deployable version of the monitor dashboard and monitor engine for `hitesh-cloud` on `vps3` as a single `TypeScript` application.

## 2. Phase Order

### Phase 1: Project Scaffold

Deliverables:

- app directory for the monitor project
- `Fastify` server bootstrap
- `React` app with routing
- modern `Tailwind CSS`
- `shadcn/ui` base setup
- environment loading and typed config
- local dev scripts, build script, and production start script

Exit criteria:

- app starts locally
- dashboard shell renders
- API health route responds

### Phase 2: Persistence And Config

Deliverables:

- Mongo connection module
- collections for `targets`, `target_status`, `check_runs`, `outages`, and `audit_events`
- indexes for current lookups and history queries
- TTL index for `check_runs`
- advanced target config file format and loader

Exit criteria:

- advanced targets load at startup
- basic target CRUD schema is defined
- retention policy works through Mongo TTL

### Phase 3: Check Engine

Deliverables:

- scheduler loop
- due-target selection logic
- direct checks: HTTP, TCP, reachability
- SSH execution layer
- advanced checks: PM2, Docker, Mongo standalone instances, Redis, heartbeat
- check result persistence
- target status recomputation

Exit criteria:

- checks execute on schedule
- failures and recoveries update status correctly
- `Run Now` can trigger a manual execution path

### Phase 4: Incidents And Notifications

Deliverables:

- outage open and resolve logic
- failure and recovery thresholds
- outage persistence
- `ntfy` notification transport
- audit events for dashboard target changes

Exit criteria:

- one outage opens per active issue
- outages resolve after recovery threshold is met
- `ntfy` only sends on state transitions

### Phase 5: Dashboard UI

Deliverables:

- `Overview` page
- `Services` page with grouped health
- `Targets` page with filters
- `Outages` page
- `Service Detail` page
- `Target Detail` page
- basic target create, edit, enable, and disable flows

Exit criteria:

- active outages are visible immediately
- service grouping works
- advanced targets appear read-only and clearly labeled
- operators can create and manage basic checks from the UI

### Phase 6: Deployment On `vps3`

Deliverables:

- production build process
- `PM2` ecosystem config
- runtime environment template
- SSH key wiring for deep checks
- Tailscale-only bind or firewall enforcement
- smoke test checklist

Exit criteria:

- one `PM2` process runs cleanly on `vps3`
- dashboard is reachable only over Tailscale
- live checks work against `vps1`, `vps2`, and public endpoints

## 3. Testing Priorities

Automated tests should focus first on:

- threshold logic
- heartbeat lateness rules
- advanced target config parsing
- scheduler due-run behavior
- state transitions and outage deduplication

Manual validation should cover:

- SSH command execution from `vps3`
- Mongo standalone instance checks
- `ntfy` delivery
- Tailscale-only reachability

## 4. Initial V1 Target Set

Seed the first advanced targets from current infrastructure:

- public domains: `arlo.dog`, `stagecouch.net`, `hitesh.nyc`, `hitesh.cc`
- host reachability: `vps1`, `vps2`, `vps3`
- PM2 runtime checks on `vps1` and `vps2`
- Redis checks on `vps1` and `vps2`
- Mongo instance checks on `vps1`, `vps2`, and `vps3`

Add heartbeat targets next for backups, cron jobs, and recurring maintenance tasks as they are identified.

## 5. Definition Of Done For V1

V1 is ready when:

- the app is deployed on `vps3`
- the dashboard is reachable over Tailscale only
- basic checks are manageable in the UI
- advanced checks load from config
- outages open and resolve correctly
- `ntfy` sends outage and recovery notifications
- raw check history expires after `90` days
- the initial `hitesh-cloud` targets are represented and visible in the dashboard
