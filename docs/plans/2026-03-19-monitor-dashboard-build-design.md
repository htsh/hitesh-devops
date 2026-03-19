# Monitor Dashboard Build Design

Date: 2026-03-19

Status: approved for planning

Related documents:

- [Infra Monitor V1 Design](./2026-03-19-monitor-design.md)
- [Infrastructure Inventory](../infra/infra.md)
- [External Monitor Options](../infra/external-monitors.md)

## 1. Goal

Define the build shape for the first implementation of the self-hosted monitor dashboard and monitor service that will run on `vps3` for `hitesh-cloud`.

This document narrows the implementation stack, runtime model, UI structure, deployment model, and delivery phases.

## 2. Decision Summary

- Use a single deployable `TypeScript` application
- Use `Fastify` for the server and internal API
- Use `React`, modern `Tailwind CSS`, and `shadcn/ui` for the dashboard
- Serve the built dashboard from the same Fastify app
- Run one process on `vps3` under `PM2`
- Restrict dashboard access through Tailscale reachability only
- Store monitor state in Mongo
- Keep raw `check_runs` for `90` days with TTL

## 3. Application Architecture

V1 should be one Node application with these in-process modules:

- API layer
- dashboard asset serving
- scheduler
- check runner
- outage manager
- `ntfy` notifier
- Mongo persistence layer
- config loader for advanced targets

There should be no separate frontend deployment, no cluster mode, and no distributed scheduler in v1.

## 4. Suggested Repo Structure

Recommended project layout inside this umbrella repo:

```text
monitor-dashboard/
  apps/
    monitor/
      src/
        server/
          api/
          checks/
          scheduler/
          incidents/
          notifications/
          db/
          config/
        web/
          routes/
          components/
          lib/
      public/
      package.json
```

This keeps the monitor isolated while leaving the repository open for other infra, business, and services work later.

## 5. Data Model

The core entity remains `targets`, but the model should separate what is being monitored from how it is checked.

Required target fields:

- `id`
- `name`
- `class` (`basic` or `advanced`)
- `service_key`
- `service_name`
- `resource_kind`
- `check_kind`
- `execution_mode`
- `node` or host location
- `enabled`
- `interval_seconds`
- `timeout_seconds`
- `failure_threshold`
- `recovery_threshold`
- `notify_on_failure`
- `metadata`

Examples:

- `resource_kind=api_service`, `check_kind=http`
- `resource_kind=pm2_process`, `check_kind=pm2_status`
- `resource_kind=docker_container`, `check_kind=docker_status`
- `resource_kind=mongo_replica_set`, `check_kind=mongo_rs`
- `resource_kind=cron_job`, `check_kind=heartbeat`

Collections:

- `targets`
- `target_status`
- `check_runs`
- `outages`
- `audit_events`

Retention:

- `check_runs`: `90` day TTL
- `targets`: retained
- `target_status`: current state only
- `outages`: retained
- `audit_events`: retained in v1

## 6. Monitoring Model

V1 should support both direct and infrastructure-aware checks.

Basic dashboard-managed checks:

- HTTP or HTTPS
- TCP port
- host reachability

Advanced config-managed checks:

- PM2 process state
- Docker container state and health
- Mongo replica set topology and role validation
- Redis reachability
- future PostgreSQL protocol checks
- SSH-backed allowlisted commands
- heartbeat checks for cron jobs, backups, and scheduled tasks

Cron-style jobs should use heartbeat logic rather than only checking whether a schedule exists.

## 7. Dashboard Shape

The UI should be service-centered, with a flat target view still available.

V1 pages:

- `Overview`
- `Services`
- `Targets`
- `Outages`
- `Service Detail`
- `Target Detail`

Minimum workflows:

- create, edit, enable, and disable basic targets
- browse advanced targets as read-only and clearly labeled `config-managed`
- drill from an outage to the affected service and target
- inspect recent failure reason summaries
- review heartbeat lateness for scheduled jobs
- run a manual `Run Now` check from target detail

## 8. Config And Deployment

Config sources:

- Mongo for basic targets created in the dashboard
- repo-managed config files for advanced targets

Deployment on `vps3`:

- one Fastify app
- one `PM2` process
- built React assets served by Fastify
- Mongo connection to `rs0`
- SSH key for checks against `vps1` and `vps2`
- runtime secrets injected outside git
- bind only to Tailscale-reachable interfaces or enforce equivalent firewall rules

`Caddy` is not required for v1 on `vps3`.

## 9. Testing Priorities

Prioritize testing for:

- outage open and resolve thresholds
- heartbeat lateness handling
- config parsing for advanced targets
- Mongo persistence and indexes
- SSH-backed advanced checks
- `ntfy` notifications on state transitions only

Use unit tests for check logic and thresholding, integration tests for API and persistence, and manual smoke tests for real network and SSH behavior.

## 10. Delivery Phases

1. Scaffold the TypeScript app, Fastify server, React app, Tailwind, and `shadcn/ui`
2. Implement Mongo models, indexes, TTL retention, and advanced target config loading
3. Build the scheduler, direct checks, SSH execution layer, and status recomputation
4. Implement outage lifecycle, audit events, and `ntfy` notifications
5. Build the dashboard pages, filters, service grouping, and basic target CRUD
6. Deploy to `vps3` with `PM2`, runtime secrets, SSH access, and smoke validation
7. Add follow-up hardening such as filtering polish, retention review, and optional heartbeat endpoints for future external monitors
