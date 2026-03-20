# Monitor Persistence and Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Mongo persistence layer with all collections, indexes, TTL retention, TypeScript types for every entity, and an advanced target config loader that seeds targets at startup.

**Architecture:** MongoDB driver connects via `config.mongoUri`. A `db` module exports typed collection accessors. An `ensureIndexes` function creates all indexes at startup. Advanced targets are defined in a YAML config file and loaded/upserted into Mongo on boot. All entity shapes are defined as TypeScript interfaces in a shared types file.

**Tech Stack:** mongodb driver, yaml (js-yaml), vitest (test runner)

---

## File Structure

```
apps/monitor/
  src/server/
    db/
      client.ts          — connect/disconnect, db instance accessor
      collections.ts     — typed collection accessors (targets, target_status, etc.)
      indexes.ts         — ensureIndexes() with all index definitions
    types.ts             — TypeScript interfaces for all entities
    schemas.ts           — Zod validation schemas for basic target CRUD
    config/
      targets.ts         — YAML config loader + upsert logic
  config/
    targets.yaml         — advanced target definitions for hitesh-cloud
  tests/
    config/
      targets.test.ts    — unit tests for config loader/parser
    schemas.test.ts      — validation schema tests
  vitest.config.ts
```

---

### Task 1: Add vitest and test infrastructure

**Files:**
- Create: `apps/monitor/vitest.config.ts`
- Modify: `apps/monitor/package.json` (add test script and vitest dep)

- [ ] **Step 1: Install vitest**

```bash
cd apps/monitor
npm install -D vitest
```

- [ ] **Step 2: Create vitest config**

Create `apps/monitor/vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    root: ".",
  },
  resolve: {
    alias: {
      "@server": path.resolve(__dirname, "src/server"),
    },
  },
});
```

- [ ] **Step 3: Add test script to package.json**

Add to `scripts` in `apps/monitor/package.json`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Create a smoke test to verify vitest works**

Create `apps/monitor/tests/smoke.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("vitest setup", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the test**

```bash
cd apps/monitor
npm test
```

Expected: 1 test passes.

- [ ] **Step 6: Delete the smoke test and commit**

Delete `apps/monitor/tests/smoke.test.ts` after verifying vitest works.

```bash
git add apps/monitor/vitest.config.ts apps/monitor/package.json apps/monitor/package-lock.json
git commit -m "add vitest test infrastructure"
```

---

### Task 2: TypeScript entity types

**Files:**
- Create: `apps/monitor/src/server/types.ts`

- [ ] **Step 1: Create the types file**

Create `apps/monitor/src/server/types.ts`:

```typescript
import type { ObjectId } from "mongodb";

// --- Enums / unions ---

export type TargetClass = "basic" | "advanced";

export type ResourceKind =
  | "api_service"
  | "tcp_service"
  | "host"
  | "pm2_process"
  | "docker_container"
  | "mongo_instance"
  | "redis_instance"
  | "cron_job";

export type CheckKind =
  | "http"
  | "tcp"
  | "ping"
  | "pm2_status"
  | "docker_status"
  | "mongo_ping"
  | "redis_ping"
  | "heartbeat"
  | "ssh_command";

export type ExecutionMode = "direct" | "ssh";

export type HealthState = "healthy" | "down" | "unknown";

// --- Core entities ---

export interface Target {
  _id?: ObjectId;
  id: string;
  name: string;
  class: TargetClass;
  service_key: string;
  service_name: string;
  resource_kind: ResourceKind;
  check_kind: CheckKind;
  execution_mode: ExecutionMode;
  node: string;
  enabled: boolean;
  interval_seconds: number;
  timeout_seconds: number;
  failure_threshold: number;
  recovery_threshold: number;
  notify_on_failure: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface TargetStatus {
  _id?: ObjectId;
  target_id: string;
  health: HealthState;
  last_check_at: Date | null;
  last_success_at: Date | null;
  last_failure_at: Date | null;
  last_failure_reason: string | null;
  consecutive_failures: number;
  consecutive_successes: number;
  updated_at: Date;
}

export interface CheckRun {
  _id?: ObjectId;
  target_id: string;
  status: "success" | "failure" | "timeout" | "error";
  duration_ms: number;
  message: string | null;
  details: Record<string, unknown> | null;
  created_at: Date;
}

export interface Outage {
  _id?: ObjectId;
  target_id: string;
  service_key: string;
  opened_at: Date;
  resolved_at: Date | null;
  last_failure_reason: string | null;
  notified_open: boolean;
  notified_resolved: boolean;
}

export interface AuditEvent {
  _id?: ObjectId;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: Date;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/monitor/src/server/types.ts
git commit -m "add TypeScript entity types for all collections"
```

---

### Task 3: Mongo connection module

**Files:**
- Create: `apps/monitor/src/server/db/client.ts`
- Modify: `apps/monitor/package.json` (add mongodb driver)

- [ ] **Step 1: Install mongodb driver**

```bash
cd apps/monitor
npm install mongodb
```

- [ ] **Step 2: Create the client module**

Create `apps/monitor/src/server/db/client.ts`:

```typescript
import { MongoClient, type Db } from "mongodb";
import { config } from "../config.js";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(config.mongoUri);
  await client.connect();
  db = client.db();
  console.log(`Connected to MongoDB: ${db.databaseName}`);
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error("Database not connected. Call connectDb() first.");
  return db;
}

export async function disconnectDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/monitor/src/server/db/client.ts apps/monitor/package.json apps/monitor/package-lock.json
git commit -m "add Mongo connection module"
```

---

### Task 4: Collection accessors and indexes

**Files:**
- Create: `apps/monitor/src/server/db/collections.ts`
- Create: `apps/monitor/src/server/db/indexes.ts`

- [ ] **Step 1: Create typed collection accessors**

Create `apps/monitor/src/server/db/collections.ts`:

```typescript
import type { Collection } from "mongodb";
import { getDb } from "./client.js";
import type {
  Target,
  TargetStatus,
  CheckRun,
  Outage,
  AuditEvent,
} from "../types.js";

export function targets(): Collection<Target> {
  return getDb().collection<Target>("targets");
}

export function targetStatus(): Collection<TargetStatus> {
  return getDb().collection<TargetStatus>("target_status");
}

export function checkRuns(): Collection<CheckRun> {
  return getDb().collection<CheckRun>("check_runs");
}

export function outages(): Collection<Outage> {
  return getDb().collection<Outage>("outages");
}

export function auditEvents(): Collection<AuditEvent> {
  return getDb().collection<AuditEvent>("audit_events");
}
```

- [ ] **Step 2: Create index definitions**

Create `apps/monitor/src/server/db/indexes.ts`:

```typescript
import { targets, targetStatus, checkRuns, outages, auditEvents } from "./collections.js";

export async function ensureIndexes(): Promise<void> {
  // targets
  await targets().createIndex({ id: 1 }, { unique: true });
  await targets().createIndex({ service_key: 1 });
  await targets().createIndex({ enabled: 1 });
  await targets().createIndex({ class: 1 });

  // target_status
  await targetStatus().createIndex({ target_id: 1 }, { unique: true });
  await targetStatus().createIndex({ health: 1 });

  // check_runs — TTL: 90 days
  await checkRuns().createIndex(
    { created_at: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60 }
  );
  await checkRuns().createIndex({ target_id: 1, created_at: -1 });

  // outages
  await outages().createIndex({ target_id: 1 });
  await outages().createIndex({ resolved_at: 1, opened_at: -1 });
  await outages().createIndex({ service_key: 1 });

  // audit_events
  await auditEvents().createIndex({ created_at: -1 });
  await auditEvents().createIndex({ entity_type: 1, entity_id: 1 });

  console.log("Database indexes ensured");
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/monitor/src/server/db/collections.ts apps/monitor/src/server/db/indexes.ts
git commit -m "add collection accessors and index definitions with TTL"
```

---

### Task 5: Advanced target config loader

**Files:**
- Create: `apps/monitor/config/targets.yaml`
- Create: `apps/monitor/src/server/config/targets.ts`
- Create: `apps/monitor/tests/config/targets.test.ts`
- Modify: `apps/monitor/package.json` (add js-yaml)

- [ ] **Step 1: Install js-yaml**

```bash
cd apps/monitor
npm install js-yaml
npm install -D @types/js-yaml
```

- [ ] **Step 2: Write the failing test for config parsing**

Create `apps/monitor/tests/config/targets.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { parseTargetsYaml } from "../../src/server/config/targets.js";

const VALID_YAML = `
targets:
  - id: vps1-caddy
    name: Caddy on vps1
    class: advanced
    service_key: caddy-vps1
    service_name: Caddy
    resource_kind: api_service
    check_kind: http
    execution_mode: direct
    node: vps1
    enabled: true
    interval_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      url: "http://100.64.0.1:80"
      expected_status: 200
`;

const MINIMAL_YAML = `
targets: []
`;

const MISSING_REQUIRED_FIELD = `
targets:
  - id: bad-target
    name: Missing fields
`;

describe("parseTargetsYaml", () => {
  it("parses a valid target config", () => {
    const result = parseTargetsYaml(VALID_YAML);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("vps1-caddy");
    expect(result[0].class).toBe("advanced");
    expect(result[0].service_key).toBe("caddy-vps1");
    expect(result[0].metadata).toEqual({ url: "http://100.64.0.1:80", expected_status: 200 });
  });

  it("returns empty array for empty targets list", () => {
    const result = parseTargetsYaml(MINIMAL_YAML);
    expect(result).toEqual([]);
  });

  it("throws on missing required fields", () => {
    expect(() => parseTargetsYaml(MISSING_REQUIRED_FIELD)).toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd apps/monitor
npm test
```

Expected: FAIL — `parseTargetsYaml` does not exist yet.

- [ ] **Step 4: Implement the config loader**

Create `apps/monitor/src/server/config/targets.ts`:

```typescript
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { Target } from "../types.js";

// Resolve from project root (apps/monitor/) not from compiled output dir
const PROJECT_ROOT = path.resolve(
  new URL(".", import.meta.url).pathname,
  // Works from both src/server/config/ and dist/server/config/
  "../../.."
);

const REQUIRED_FIELDS = [
  "id",
  "name",
  "class",
  "service_key",
  "service_name",
  "resource_kind",
  "check_kind",
  "execution_mode",
  "node",
] as const;

interface RawTargetConfig {
  targets: Record<string, unknown>[];
}

export function parseTargetsYaml(content: string): Omit<Target, "_id" | "created_at" | "updated_at">[] {
  const doc = yaml.load(content) as RawTargetConfig;
  const raw = doc?.targets ?? [];

  return raw.map((entry, i) => {
    for (const field of REQUIRED_FIELDS) {
      if (entry[field] === undefined || entry[field] === null) {
        throw new Error(`Target at index ${i} missing required field: ${field}`);
      }
    }

    return {
      id: entry.id as string,
      name: entry.name as string,
      class: entry.class as Target["class"],
      service_key: entry.service_key as string,
      service_name: entry.service_name as string,
      resource_kind: entry.resource_kind as Target["resource_kind"],
      check_kind: entry.check_kind as Target["check_kind"],
      execution_mode: entry.execution_mode as Target["execution_mode"],
      node: entry.node as string,
      enabled: entry.enabled !== false,
      interval_seconds: (entry.interval_seconds as number) ?? 60,
      timeout_seconds: (entry.timeout_seconds as number) ?? 10,
      failure_threshold: (entry.failure_threshold as number) ?? 3,
      recovery_threshold: (entry.recovery_threshold as number) ?? 2,
      notify_on_failure: entry.notify_on_failure !== false,
      metadata: (entry.metadata as Record<string, unknown>) ?? {},
    };
  });
}

export function loadTargetsFromFile(): Omit<Target, "_id" | "created_at" | "updated_at">[] {
  const configPath = path.resolve(PROJECT_ROOT, "config/targets.yaml");
  if (!fs.existsSync(configPath)) {
    console.warn(`No advanced target config found at ${configPath}`);
    return [];
  }
  const content = fs.readFileSync(configPath, "utf-8");
  return parseTargetsYaml(content);
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/monitor
npm test
```

Expected: All 3 tests pass.

- [ ] **Step 6: Create the seed targets.yaml**

Create `apps/monitor/config/targets.yaml`:

```yaml
targets:
  # --- Public endpoints ---
  - id: http-arlo-dog
    name: arlo.dog
    class: advanced
    service_key: arlo-dog
    service_name: arlo.dog
    resource_kind: api_service
    check_kind: http
    execution_mode: direct
    node: vps1
    enabled: true
    interval_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      url: "https://arlo.dog"
      expected_status: 200

  - id: http-stagecouch-net
    name: stagecouch.net
    class: advanced
    service_key: stagecouch-net
    service_name: stagecouch.net
    resource_kind: api_service
    check_kind: http
    execution_mode: direct
    node: vps1
    enabled: true
    interval_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      url: "https://stagecouch.net"
      expected_status: 200

  - id: http-hitesh-nyc
    name: hitesh.nyc
    class: advanced
    service_key: hitesh-nyc
    service_name: hitesh.nyc
    resource_kind: api_service
    check_kind: http
    execution_mode: direct
    node: vps2
    enabled: true
    interval_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      url: "https://hitesh.nyc"
      expected_status: 200

  - id: http-hitesh-cc
    name: hitesh.cc
    class: advanced
    service_key: hitesh-cc
    service_name: hitesh.cc
    resource_kind: api_service
    check_kind: http
    execution_mode: direct
    node: vps3
    enabled: true
    interval_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      url: "https://hitesh.cc"
      expected_status: 200

  # --- Caddy ---
  - id: caddy-vps1
    name: Caddy on vps1
    class: advanced
    service_key: caddy-vps1
    service_name: Caddy
    resource_kind: api_service
    check_kind: http
    execution_mode: ssh
    node: vps1
    enabled: true
    interval_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      url: "http://127.0.0.1:80"
      expected_status: 200

  - id: caddy-vps2
    name: Caddy on vps2
    class: advanced
    service_key: caddy-vps2
    service_name: Caddy
    resource_kind: api_service
    check_kind: http
    execution_mode: ssh
    node: vps2
    enabled: true
    interval_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      url: "http://127.0.0.1:80"
      expected_status: 200

  # --- Host reachability ---
  - id: ping-vps1
    name: vps1 reachability
    class: advanced
    service_key: vps1-host
    service_name: vps1
    resource_kind: host
    check_kind: ping
    execution_mode: direct
    node: vps1
    enabled: true
    interval_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      host: "100.64.0.1"

  - id: ping-vps2
    name: vps2 reachability
    class: advanced
    service_key: vps2-host
    service_name: vps2
    resource_kind: host
    check_kind: ping
    execution_mode: direct
    node: vps2
    enabled: true
    interval_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      host: "100.64.0.2"

  - id: ping-vps3
    name: vps3 reachability
    class: advanced
    service_key: vps3-host
    service_name: vps3
    resource_kind: host
    check_kind: ping
    execution_mode: direct
    node: vps3
    enabled: true
    interval_seconds: 30
    timeout_seconds: 5
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      host: "127.0.0.1"

  # --- Redis ---
  - id: redis-vps1
    name: Redis on vps1
    class: advanced
    service_key: redis-vps1
    service_name: Redis
    resource_kind: redis_instance
    check_kind: redis_ping
    execution_mode: ssh
    node: vps1
    enabled: true
    interval_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      host: "127.0.0.1"
      port: 6379

  - id: redis-vps2
    name: Redis on vps2
    class: advanced
    service_key: redis-vps2
    service_name: Redis
    resource_kind: redis_instance
    check_kind: redis_ping
    execution_mode: ssh
    node: vps2
    enabled: true
    interval_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      host: "127.0.0.1"
      port: 6379

  # --- PM2 ---
  - id: pm2-vps1
    name: PM2 on vps1
    class: advanced
    service_key: pm2-vps1
    service_name: PM2 Runtime
    resource_kind: pm2_process
    check_kind: pm2_status
    execution_mode: ssh
    node: vps1
    enabled: true
    interval_seconds: 60
    timeout_seconds: 15
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata: {}

  - id: pm2-vps2
    name: PM2 on vps2
    class: advanced
    service_key: pm2-vps2
    service_name: PM2 Runtime
    resource_kind: pm2_process
    check_kind: pm2_status
    execution_mode: ssh
    node: vps2
    enabled: true
    interval_seconds: 60
    timeout_seconds: 15
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata: {}

  # --- Mongo ---
  - id: mongo-vps1
    name: MongoDB on vps1
    class: advanced
    service_key: mongo-vps1
    service_name: MongoDB
    resource_kind: mongo_instance
    check_kind: mongo_ping
    execution_mode: ssh
    node: vps1
    enabled: true
    interval_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      port: 27017

  - id: mongo-vps2
    name: MongoDB on vps2
    class: advanced
    service_key: mongo-vps2
    service_name: MongoDB
    resource_kind: mongo_instance
    check_kind: mongo_ping
    execution_mode: ssh
    node: vps2
    enabled: true
    interval_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      port: 27017

  - id: mongo-vps3
    name: MongoDB on vps3
    class: advanced
    service_key: mongo-vps3
    service_name: MongoDB
    resource_kind: mongo_instance
    check_kind: mongo_ping
    execution_mode: direct
    node: vps3
    enabled: true
    interval_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      port: 27017
```

- [ ] **Step 7: Add a test for loadTargetsFromFile**

Add to `apps/monitor/tests/config/targets.test.ts`:

```typescript
import { loadTargetsFromFile } from "../../src/server/config/targets.js";

describe("loadTargetsFromFile", () => {
  it("loads the seed targets.yaml", () => {
    const targets = loadTargetsFromFile();
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.every((t) => t.class === "advanced")).toBe(true);
    expect(targets.every((t) => t.id && t.name && t.service_key)).toBe(true);
  });
});
```

- [ ] **Step 8: Run tests**

```bash
cd apps/monitor
npm test
```

Expected: All 4 tests pass.

- [ ] **Step 9: Commit**

```bash
git add apps/monitor/src/server/config/targets.ts apps/monitor/config/targets.yaml apps/monitor/tests/config/targets.test.ts apps/monitor/package.json apps/monitor/package-lock.json
git commit -m "add advanced target config loader with seed targets"
```

---

### Task 6: Basic target CRUD validation schemas

**Files:**
- Create: `apps/monitor/src/server/schemas.ts`
- Create: `apps/monitor/tests/schemas.test.ts`
- Modify: `apps/monitor/package.json` (add zod)

- [ ] **Step 1: Install zod**

```bash
cd apps/monitor
npm install zod
```

- [ ] **Step 2: Write failing tests for the schemas**

Create `apps/monitor/tests/schemas.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { CreateBasicTargetSchema, UpdateBasicTargetSchema } from "../src/server/schemas.js";

describe("CreateBasicTargetSchema", () => {
  it("validates a valid basic target", () => {
    const result = CreateBasicTargetSchema.safeParse({
      name: "My HTTP Check",
      service_key: "my-service",
      service_name: "My Service",
      check_kind: "http",
      node: "vps1",
      metadata: { url: "https://example.com", expected_status: 200 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.class).toBe("basic");
      expect(result.data.interval_seconds).toBe(60);
      expect(result.data.failure_threshold).toBe(3);
    }
  });

  it("rejects invalid check_kind", () => {
    const result = CreateBasicTargetSchema.safeParse({
      name: "Bad Check",
      service_key: "svc",
      service_name: "Svc",
      check_kind: "pm2_status",
      node: "vps1",
      metadata: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = CreateBasicTargetSchema.safeParse({ name: "Only name" });
    expect(result.success).toBe(false);
  });
});

describe("UpdateBasicTargetSchema", () => {
  it("allows partial updates", () => {
    const result = UpdateBasicTargetSchema.safeParse({
      name: "Updated Name",
      enabled: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty update", () => {
    const result = UpdateBasicTargetSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd apps/monitor
npm test
```

Expected: FAIL — `schemas.js` does not exist yet.

- [ ] **Step 4: Implement the schemas**

Create `apps/monitor/src/server/schemas.ts`:

```typescript
import { z } from "zod";

const BASIC_CHECK_KINDS = ["http", "tcp", "ping"] as const;

export const CreateBasicTargetSchema = z.object({
  name: z.string().min(1).max(200),
  service_key: z.string().min(1).max(100),
  service_name: z.string().min(1).max(200),
  check_kind: z.enum(BASIC_CHECK_KINDS),
  node: z.string().min(1),
  enabled: z.boolean().default(true),
  interval_seconds: z.number().int().min(10).max(3600).default(60),
  timeout_seconds: z.number().int().min(1).max(60).default(10),
  failure_threshold: z.number().int().min(1).max(20).default(3),
  recovery_threshold: z.number().int().min(1).max(20).default(2),
  notify_on_failure: z.boolean().default(true),
  metadata: z.record(z.unknown()).default({}),
}).transform((data) => ({
  ...data,
  class: "basic" as const,
  resource_kind: data.check_kind === "http" ? "api_service" as const
    : data.check_kind === "tcp" ? "tcp_service" as const
    : "host" as const,
  execution_mode: "direct" as const,
}));

export const UpdateBasicTargetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  service_key: z.string().min(1).max(100).optional(),
  service_name: z.string().min(1).max(200).optional(),
  check_kind: z.enum(BASIC_CHECK_KINDS).optional(),
  node: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  interval_seconds: z.number().int().min(10).max(3600).optional(),
  timeout_seconds: z.number().int().min(1).max(60).optional(),
  failure_threshold: z.number().int().min(1).max(20).optional(),
  recovery_threshold: z.number().int().min(1).max(20).optional(),
  notify_on_failure: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided",
});

export type CreateBasicTarget = z.infer<typeof CreateBasicTargetSchema>;
export type UpdateBasicTarget = z.infer<typeof UpdateBasicTargetSchema>;
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/monitor
npm test
```

Expected: All tests pass (config tests + schema tests).

- [ ] **Step 6: Commit**

```bash
git add apps/monitor/src/server/schemas.ts apps/monitor/tests/schemas.test.ts apps/monitor/package.json apps/monitor/package-lock.json
git commit -m "add Zod validation schemas for basic target CRUD"
```

---

### Task 7: Wire persistence into server startup

**Files:**
- Modify: `apps/monitor/src/server/index.ts`
- Create: `apps/monitor/src/server/db/seed.ts`

- [ ] **Step 1: Create the seed/upsert module**

Create `apps/monitor/src/server/db/seed.ts`:

```typescript
import { targets, targetStatus } from "./collections.js";
import { loadTargetsFromFile } from "../config/targets.js";
import type { Target, TargetStatus } from "../types.js";

export async function seedAdvancedTargets(): Promise<number> {
  const configs = loadTargetsFromFile();
  let upserted = 0;

  for (const cfg of configs) {
    const now = new Date();

    await targets().updateOne(
      { id: cfg.id },
      {
        $set: {
          ...cfg,
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
        },
      },
      { upsert: true }
    );

    // Ensure a target_status doc exists
    await targetStatus().updateOne(
      { target_id: cfg.id },
      {
        $setOnInsert: {
          target_id: cfg.id,
          health: "unknown",
          last_check_at: null,
          last_success_at: null,
          last_failure_at: null,
          last_failure_reason: null,
          consecutive_failures: 0,
          consecutive_successes: 0,
          updated_at: now,
        } satisfies Omit<TargetStatus, "_id">,
      },
      { upsert: true }
    );

    upserted++;
  }

  console.log(`Seeded ${upserted} advanced targets`);
  return upserted;
}
```

- [ ] **Step 2: Update server index.ts to connect to Mongo and seed on startup**

Modify `apps/monitor/src/server/index.ts` to:

```typescript
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { healthRoutes } from "./api/health.js";
import { connectDb, disconnectDb } from "./db/client.js";
import { ensureIndexes } from "./db/indexes.js";
import { seedAdvancedTargets } from "./db/seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function start() {
  const app = Fastify({ logger: true });

  // Database
  await connectDb();
  await ensureIndexes();
  await seedAdvancedTargets();

  // API routes
  await app.register(healthRoutes);

  // Static file serving in production
  if (!config.isDev) {
    await app.register(fastifyStatic, {
      root: path.resolve(__dirname, "../../dist/web"),
      prefix: "/",
    });

    app.setNotFoundHandler((_req, reply) => {
      reply.sendFile("index.html");
    });
  }

  // Graceful shutdown
  const shutdown = async () => {
    await app.close();
    await disconnectDb();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await app.listen({ port: config.port, host: config.host });
  console.log(`Monitor running at http://${config.host}:${config.port}`);
}

start();
```

- [ ] **Step 3: Verify startup with Mongo**

This requires a running Mongo instance. Set `MONGO_URI` in `.env` to point at a reachable Mongo, then:

```bash
cd apps/monitor
npx tsx src/server/index.ts
```

Expected output includes:
- `Connected to MongoDB: monitor`
- `Database indexes ensured`
- `Seeded N advanced targets`
- Server starts on port 3100

Verify health route still works:

```bash
curl http://localhost:3100/api/health
```

- [ ] **Step 4: Commit**

```bash
git add apps/monitor/src/server/db/seed.ts apps/monitor/src/server/index.ts
git commit -m "wire Mongo persistence and target seeding into server startup"
```
