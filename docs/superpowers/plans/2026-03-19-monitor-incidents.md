# Monitor Phase 4: Incidents and Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add outage lifecycle management and ntfy notifications so operators get alerted on state transitions.

**Architecture:** After each check run, incident logic inspects the health transition (previousHealth → newHealth). If health transitions to "down", an outage record opens. If it transitions to "healthy", the active outage resolves. The ntfy notifier fires on open/resolve transitions only. Audit events log dashboard-initiated target changes for traceability.

**Tech Stack:** TypeScript, MongoDB driver, node fetch (for ntfy POST), vitest

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/server/config.ts` | Add `ntfyUrl` and `ntfyTopic` config fields |
| `src/server/incidents/outages.ts` | Open/resolve outage logic (pure DB operations) |
| `src/server/incidents/notifier.ts` | ntfy HTTP POST transport |
| `src/server/incidents/handler.ts` | Orchestrator: given a health transition, open/resolve outage + notify |
| `src/server/incidents/audit.ts` | Audit event logging helper |
| `src/server/checks/runner.ts` | Wire incident handler after status recomputation |
| `tests/incidents/outages.test.ts` | Unit tests for outage open/resolve decision logic |
| `tests/incidents/notifier.test.ts` | Unit tests for notification message formatting |

---

### Task 1: Add ntfy config

**Files:**
- Modify: `apps/monitor/src/server/config.ts`
- Modify: `apps/monitor/.env.example`

- [ ] **Step 1: Add ntfy fields to config**

Modify `apps/monitor/src/server/config.ts` — add two new fields to the config object:

```typescript
export const config = {
  port: parseInt(process.env.PORT || "3100", 10),
  host: process.env.HOST || "0.0.0.0",
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGO_URI || "mongodb://localhost:27017/monitor",
  isDev: (process.env.NODE_ENV || "development") === "development",
  ntfyUrl: process.env.NTFY_URL || "https://ntfy.sh",
  ntfyTopic: process.env.NTFY_TOPIC || "",
} as const;
```

- [ ] **Step 2: Add env vars to .env.example**

Append to `apps/monitor/.env.example`:

```
NTFY_URL=https://ntfy.sh
NTFY_TOPIC=hitesh-monitor
```

Also add these to `.env` locally.

- [ ] **Step 3: Commit**

```bash
git add apps/monitor/src/server/config.ts apps/monitor/.env.example
git commit -m "add ntfy config fields"
```

---

### Task 2: Outage open/resolve logic with TDD

**Files:**
- Create: `apps/monitor/src/server/incidents/outages.ts`
- Create: `apps/monitor/tests/incidents/outages.test.ts`

- [ ] **Step 1: Write failing tests for outage decision logic**

Create `apps/monitor/tests/incidents/outages.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { shouldOpenOutage, shouldResolveOutage } from "../../src/server/incidents/outages.js";
import type { HealthState } from "../../src/server/types.js";

describe("shouldOpenOutage", () => {
  it("returns true when transitioning to down from healthy", () => {
    expect(shouldOpenOutage("healthy", "down")).toBe(true);
  });

  it("returns true when transitioning to down from unknown", () => {
    expect(shouldOpenOutage("unknown", "down")).toBe(true);
  });

  it("returns false when staying down", () => {
    expect(shouldOpenOutage("down", "down")).toBe(false);
  });

  it("returns false when staying healthy", () => {
    expect(shouldOpenOutage("healthy", "healthy")).toBe(false);
  });

  it("returns false when transitioning to healthy", () => {
    expect(shouldOpenOutage("down", "healthy")).toBe(false);
  });
});

describe("shouldResolveOutage", () => {
  it("returns true when transitioning from down to healthy", () => {
    expect(shouldResolveOutage("down", "healthy")).toBe(true);
  });

  it("returns false when staying healthy", () => {
    expect(shouldResolveOutage("healthy", "healthy")).toBe(false);
  });

  it("returns false when staying down", () => {
    expect(shouldResolveOutage("down", "down")).toBe(false);
  });

  it("returns false when transitioning to down", () => {
    expect(shouldResolveOutage("healthy", "down")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/monitor && npm test
```

Expected: FAIL — `shouldOpenOutage` and `shouldResolveOutage` not found.

- [ ] **Step 3: Implement outage logic**

Create `apps/monitor/src/server/incidents/outages.ts`:

```typescript
import type { HealthState } from "../types.js";
import { outages } from "../db/collections.js";

/**
 * Determines whether a new outage should be opened.
 * Only opens on a transition INTO "down" — not when already down.
 */
export function shouldOpenOutage(
  previousHealth: HealthState,
  newHealth: HealthState,
): boolean {
  return newHealth === "down" && previousHealth !== "down";
}

/**
 * Determines whether an active outage should be resolved.
 * Only resolves on a transition FROM "down" to "healthy".
 */
export function shouldResolveOutage(
  previousHealth: HealthState,
  newHealth: HealthState,
): boolean {
  return previousHealth === "down" && newHealth === "healthy";
}

/**
 * Opens a new outage record for a target.
 */
export async function openOutage(
  targetId: string,
  serviceKey: string,
  failureReason: string | null,
): Promise<string> {
  const now = new Date();
  const result = await outages().insertOne({
    target_id: targetId,
    service_key: serviceKey,
    opened_at: now,
    resolved_at: null,
    last_failure_reason: failureReason,
    notified_open: false,
    notified_resolved: false,
  });
  return result.insertedId.toHexString();
}

/**
 * Resolves the active (unresolved) outage for a target.
 */
export async function resolveOutage(targetId: string): Promise<boolean> {
  const now = new Date();
  const result = await outages().updateOne(
    { target_id: targetId, resolved_at: null },
    { $set: { resolved_at: now } },
  );
  return result.modifiedCount > 0;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/monitor && npm test
```

Expected: All tests pass including the 9 new outage decision tests.

- [ ] **Step 5: Commit**

```bash
git add apps/monitor/src/server/incidents/outages.ts apps/monitor/tests/incidents/outages.test.ts
git commit -m "add outage open/resolve logic with tests"
```

---

### Task 3: ntfy notifier with TDD

**Files:**
- Create: `apps/monitor/src/server/incidents/notifier.ts`
- Create: `apps/monitor/tests/incidents/notifier.test.ts`

- [ ] **Step 1: Write failing tests for message formatting**

Create `apps/monitor/tests/incidents/notifier.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { formatOutageMessage, formatRecoveryMessage } from "../../src/server/incidents/notifier.js";

describe("formatOutageMessage", () => {
  it("formats an outage notification", () => {
    const msg = formatOutageMessage("caddy-vps1", "caddy", "Connection refused");
    expect(msg.title).toContain("caddy-vps1");
    expect(msg.title).toContain("DOWN");
    expect(msg.body).toContain("Connection refused");
    expect(msg.tags).toContain("rotating_light");
    expect(msg.priority).toBe("urgent");
  });

  it("handles null failure reason", () => {
    const msg = formatOutageMessage("ping-vps2", "network", null);
    expect(msg.title).toContain("ping-vps2");
    expect(msg.body).toBeDefined();
  });
});

describe("formatRecoveryMessage", () => {
  it("formats a recovery notification", () => {
    const msg = formatRecoveryMessage("caddy-vps1", "caddy", 300);
    expect(msg.title).toContain("caddy-vps1");
    expect(msg.title).toContain("RECOVERED");
    expect(msg.body).toContain("5m");
    expect(msg.tags).toContain("white_check_mark");
    expect(msg.priority).toBe("default");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/monitor && npm test
```

- [ ] **Step 3: Implement the notifier**

Create `apps/monitor/src/server/incidents/notifier.ts`:

```typescript
import { config } from "../config.js";

export interface NtfyMessage {
  title: string;
  body: string;
  tags: string;
  priority: string;
}

/**
 * Format the duration in seconds to a human-readable string.
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function formatOutageMessage(
  targetId: string,
  serviceKey: string,
  failureReason: string | null,
): NtfyMessage {
  return {
    title: `DOWN: ${targetId}`,
    body: `Service "${serviceKey}" — ${failureReason ?? "check failed"}`,
    tags: "rotating_light",
    priority: "urgent",
  };
}

export function formatRecoveryMessage(
  targetId: string,
  serviceKey: string,
  downtimeSeconds: number,
): NtfyMessage {
  return {
    title: `RECOVERED: ${targetId}`,
    body: `Service "${serviceKey}" is back up after ${formatDuration(downtimeSeconds)}`,
    tags: "white_check_mark",
    priority: "default",
  };
}

/**
 * Sends a notification via ntfy. Silently logs errors — notifications
 * must never break the check pipeline.
 */
export async function sendNtfy(message: NtfyMessage): Promise<boolean> {
  if (!config.ntfyTopic) {
    console.warn("ntfy: no topic configured, skipping notification");
    return false;
  }

  const url = `${config.ntfyUrl}/${config.ntfyTopic}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Title: message.title,
        Tags: message.tags,
        Priority: message.priority,
      },
      body: message.body,
    });

    if (!res.ok) {
      console.error(`ntfy: HTTP ${res.status} — ${await res.text()}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("ntfy: send failed —", err);
    return false;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/monitor && npm test
```

Expected: All tests pass including the 3 new notifier tests.

- [ ] **Step 5: Commit**

```bash
git add apps/monitor/src/server/incidents/notifier.ts apps/monitor/tests/incidents/notifier.test.ts
git commit -m "add ntfy notifier with message formatting"
```

---

### Task 4: Incident handler (orchestrator)

**Files:**
- Create: `apps/monitor/src/server/incidents/handler.ts`

- [ ] **Step 1: Implement the incident handler**

Create `apps/monitor/src/server/incidents/handler.ts`:

```typescript
import type { Target, HealthState } from "../types.js";
import {
  shouldOpenOutage,
  shouldResolveOutage,
  openOutage,
  resolveOutage,
} from "./outages.js";
import {
  formatOutageMessage,
  formatRecoveryMessage,
  sendNtfy,
} from "./notifier.js";
import { outages } from "../db/collections.js";

/**
 * Handles incident lifecycle after a check run completes.
 * Called by the runner when health state may have changed.
 */
export async function handleIncident(
  target: Target,
  previousHealth: HealthState,
  newHealth: HealthState,
  failureReason: string | null,
): Promise<void> {
  if (shouldOpenOutage(previousHealth, newHealth)) {
    await openOutage(target.id, target.service_key, failureReason);

    if (target.notify_on_failure) {
      const msg = formatOutageMessage(target.id, target.service_key, failureReason);
      const sent = await sendNtfy(msg);
      if (sent) {
        await outages().updateOne(
          { target_id: target.id, resolved_at: null },
          { $set: { notified_open: true } },
        );
      }
    }

    console.log(`Outage opened: ${target.id}`);
    return;
  }

  if (shouldResolveOutage(previousHealth, newHealth)) {
    // Calculate downtime from the active outage
    const activeOutage = await outages().findOne({
      target_id: target.id,
      resolved_at: null,
    });

    const resolved = await resolveOutage(target.id);

    if (resolved && target.notify_on_failure) {
      const downtimeSeconds = activeOutage
        ? Math.round((Date.now() - activeOutage.opened_at.getTime()) / 1000)
        : 0;

      const msg = formatRecoveryMessage(target.id, target.service_key, downtimeSeconds);
      const sent = await sendNtfy(msg);
      if (sent && activeOutage) {
        await outages().updateOne(
          { _id: activeOutage._id },
          { $set: { notified_resolved: true } },
        );
      }
    }

    console.log(`Outage resolved: ${target.id}`);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/monitor && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/monitor/src/server/incidents/handler.ts
git commit -m "add incident handler orchestrating outage lifecycle"
```

---

### Task 5: Audit event helper

**Files:**
- Create: `apps/monitor/src/server/incidents/audit.ts`

- [ ] **Step 1: Implement the audit logger**

Create `apps/monitor/src/server/incidents/audit.ts`:

```typescript
import { auditEvents } from "../db/collections.js";

/**
 * Logs an audit event. Used by dashboard CRUD routes to track
 * target create/update/enable/disable actions.
 */
export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown> | null = null,
): Promise<void> {
  await auditEvents().insertOne({
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    created_at: new Date(),
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/monitor && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/monitor/src/server/incidents/audit.ts
git commit -m "add audit event logging helper"
```

---

### Task 6: Wire incident handler into check runner

**Files:**
- Modify: `apps/monitor/src/server/checks/runner.ts`

- [ ] **Step 1: Add incident handling to runCheck**

Modify `apps/monitor/src/server/checks/runner.ts`. Add the import at the top, after existing imports:

```typescript
import { handleIncident } from "../incidents/handler.js";
```

Then, at the end of the `runCheck` function, just before the `return` statement (after the `targetStatus().updateOne(...)` call), add:

```typescript
  // Handle incident lifecycle (outage open/resolve + notifications)
  await handleIncident(target, previousHealth, newStatus.health, result.message);
```

- [ ] **Step 2: Run all tests**

```bash
cd apps/monitor && npm test
```

Expected: All tests pass (25 existing + 12 new = 37 total).

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/monitor && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add apps/monitor/src/server/checks/runner.ts
git commit -m "wire incident handler into check runner"
```

---

### Task 7: Correlated failure logging

**Files:**
- Modify: `apps/monitor/src/server/scheduler/loop.ts`

- [ ] **Step 1: Add correlated failure detection to tick**

Modify `apps/monitor/src/server/scheduler/loop.ts`. After the `for` loop that runs checks (still inside the `try` block), add detection logic. The modified `tick` function should look like this:

```typescript
async function tick(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const enabledTargets = await targets().find({ enabled: true }).toArray();
    const statuses = await targetStatus().find({}).toArray();
    const statusMap = new Map(statuses.map((s) => [s.target_id, s]));

    // Track SSH check failures per node in this tick
    const nodeFailures = new Map<string, string[]>();

    for (const target of enabledTargets) {
      const status = statusMap.get(target.id);
      const lastCheck = status?.last_check_at ?? null;

      if (!isDue(target, lastCheck)) continue;

      try {
        const { result } = await runCheck(target);

        // Track SSH-based check failures by node
        if (target.execution_mode === "ssh" && result.status !== "success") {
          const fails = nodeFailures.get(target.node) ?? [];
          fails.push(target.id);
          nodeFailures.set(target.node, fails);
        }
      } catch (err) {
        console.error(`Check failed for ${target.id}:`, err);
      }
    }

    // Log correlated SSH failures
    for (const [node, failedTargets] of nodeFailures) {
      if (failedTargets.length >= 2) {
        console.warn(
          `Correlated failure: ${failedTargets.length} SSH checks failed on node "${node}" — ` +
          `likely Tailscale/network issue. Targets: ${failedTargets.join(", ")}`,
        );
      }
    }
  } catch (err) {
    console.error("Scheduler tick error:", err);
  } finally {
    running = false;
  }
}
```

- [ ] **Step 2: Run all tests**

```bash
cd apps/monitor && npm test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add apps/monitor/src/server/scheduler/loop.ts
git commit -m "add correlated SSH failure detection logging"
```
