# Infrastructure Inventory (Reusable Deploy Targets)

Last updated: 2026-03-20 (MongoDB topology updated from replica set to standalone instances)

## Summary

Three VPS nodes connected via **Tailscale** (`vps1`, `vps2`, `vps3`). Typical pattern:

* `vps1`: public edge + app hosting (best place for internet-facing services)
* `vps2`: data/ingest/heavy workloads (best place for databases, workers, high I/O)
* `vps3`: light utility + quorum roles (keep low-noise / stable)

---

## Node Inventory

| Node   | OS        | CPU     | RAM    | Disk              | Bandwidth           | Primary Role                 |
| ------ | --------- | ------- | ------ | ----------------- | ------------------- | ---------------------------- |
| `vps1` | AlmaLinux | 2 cores | 4 GB   | 70 GB NVMe        | **Unmetered**       | Public edge + app node       |
| `vps2` | Ubuntu    | 6 cores | 8 GB   | 120 GB RAID10 SSD | **Metered (~9 TB)** | Data + ingest heavy node     |
| `vps3` | Ubuntu    | 2 cores | 2.5 GB | 40 GB RAID10 SSD  | **Metered (~7 TB)** | Light utility / internal ops node |

---

## Domains / DNS Mapping

* `arlo.dog` → `vps1`
* `stagecouch.net` → `vps1`
* `api.stagecouch.net` → `vps1` (`Stagecouch` backend endpoint; currently assigned there even if the app is offline)
* `hitesh.nyc` → `vps2`
* `hitesh.cc` → `vps3`

---

## Networking

* Inter-node communication over **Tailscale**

  * Node hostnames on tailnet: `vps1`, `vps2`, `vps3`
* Internal services should bind to:

  * `localhost` and/or the **Tailscale interface**
* Prefer exposing public services via the edge node (`vps1`) rather than opening ports on all nodes.

---

## Shared Platform Services (Current Footprint)

### Reverse Proxy / TLS

* **Caddy**

  * Installed on `vps1` and `vps2`
  * Typical configuration: `vps1` serves as the active public edge; `vps2` can act as standby or internal edge if needed.

### Data Store

* **MongoDB** as independent standalone instances on all three nodes:

  * `vps2:27017` = main standalone with the existing shared user data
  * `vps3:27017` = standalone for monitor-related local use
  * `vps1:27017` = standalone for future/local use
  * There is no active MongoDB replica set in the current topology
* **MariaDB** installed on `vps2`

  * Snapshot date: `2026-03-19`
  * Current confirmed use: `bible-api`
  * Current confirmed database: `bible_api`
  * Treat it as a node-local relational data service on `vps2` unless and until other consumers are documented

### Cache / Queueing (Lightweight)

* **Redis**

  * Installed on `vps1` and `vps2`
  * Typical pattern: `vps2` hosts the “shared” Redis used by applications; `vps1` may have local Redis for node-local needs.

### Process Management (App Nodes)

* **PM2** is used as a process manager for Node-based services on app-capable nodes (`vps1`, `vps2`) where applicable.
* Snapshot date: `2026-03-19`
* Current confirmed active example on `vps2`: `bible-api`
* Source note: documented from `htsh/bible_api` deployment files and user confirmation.

---

## Default Placement Guide (Deploy Heuristics)

Use these defaults when choosing a deploy target:

* Put **public web frontends** and **reverse-proxy entrypoints** on `vps1`.

  * Best for websites, dashboards, and anything that needs stable public ingress.
* Put **data-heavy**, **ingestion-heavy**, or **background-processing** workloads on `vps2`.

  * Best for databases, workers, queues, analytics, and high-query APIs.
* Keep `vps3` **quiet and stable**.

  * Good for low-noise utility services and internal operations.
  * Avoid heavy containers, memory spikes, or noisy workloads.

---

## Practical Examples (Generic)

* Blog / CMS:

  * Web frontend on `vps1`
  * Database on `vps2` (if self-hosted)
* Public-facing microservice:

  * Public ingress on `vps1` (Caddy)
  * Service runtime on `vps1` or `vps2` depending on CPU/data needs
* Worker / ingest pipeline:

  * Run on `vps2`
  * Keep any required state (DB/Redis) on `vps2` unless replication is required

---

## Operational Notes (Keep Updated)

* Track which node is the **active edge** for each public domain (usually `vps1`).
* Keep the live service inventory in `docs/infra/service-manifest.md`.
* Re-check Redis usage: shared on `vps2` vs node-local on `vps1`.
* Keep MongoDB connection assumptions explicit per project: shared data should point to `vps2`, and node-local use on `vps1` or `vps3` should use local standalone URIs intentionally.
* Ensure projects document:

  * which domains they use
  * which nodes host app vs data vs workers
  * which internal ports/services are reachable over Tailscale vs public ingress
