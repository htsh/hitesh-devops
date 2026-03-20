# Monitor Phase 5: Dashboard UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin dashboard UI with 6 pages (Overview, Services, Targets, Outages, Service Detail, Target Detail) plus basic target CRUD, backed by REST API routes.

**Architecture:** API-first approach — build Fastify REST endpoints first, then React pages that consume them via fetch. Pages use React Router for navigation. All pages follow dark zinc theme with shadcn/ui components. The frontend-design skill should be used for UI implementation to ensure high design quality.

**Tech Stack:** TypeScript, Fastify, React 19, React Router, Tailwind CSS v4, shadcn/ui (new-york style, zinc theme), lucide-react icons

---

## File Structure

### API Layer (server)

| File | Responsibility |
|------|---------------|
| `src/server/api/dashboard.ts` | Read-only API routes for dashboard data (overview stats, services list, targets list with status, outages list, service detail, target detail with recent check runs) |
| `src/server/api/targets.ts` | Extended with CRUD routes for basic targets (create, update, enable/disable) — already has Run Now and heartbeat |

### Frontend Layer (web)

| File | Responsibility |
|------|---------------|
| `src/web/app.tsx` | App shell with nav links + routes for all pages |
| `src/web/lib/api.ts` | Typed fetch helpers for all API endpoints |
| `src/web/pages/overview.tsx` | Overview page — stats cards, active outages, recent failures |
| `src/web/pages/services.tsx` | Services page — grouped service health cards |
| `src/web/pages/targets.tsx` | Targets page — filterable table of all targets with status |
| `src/web/pages/outages.tsx` | Outages page — open + recent resolved outages |
| `src/web/pages/service-detail.tsx` | Service detail — targets under service, outages for service |
| `src/web/pages/target-detail.tsx` | Target detail — config, recent checks, outage history |
| `src/web/pages/target-form.tsx` | Create/edit form for basic targets |
| `src/web/components/ui/badge.tsx` | shadcn badge component |
| `src/web/components/ui/card.tsx` | shadcn card component |
| `src/web/components/ui/input.tsx` | shadcn input component |
| `src/web/components/ui/label.tsx` | shadcn label component |
| `src/web/components/ui/select.tsx` | shadcn select component |
| `src/web/components/ui/table.tsx` | shadcn table component |
| `src/web/components/status-dot.tsx` | Reusable health status indicator dot |

---

### Task 1: Dashboard read API routes

**Files:**
- Create: `apps/monitor/src/server/api/dashboard.ts`
- Modify: `apps/monitor/src/server/index.ts`

- [ ] **Step 1: Implement dashboard API routes**

Create `apps/monitor/src/server/api/dashboard.ts`:

```typescript
import type { FastifyInstance } from "fastify";
import { targets, targetStatus, checkRuns, outages } from "../db/collections.js";

export async function dashboardRoutes(app: FastifyInstance) {
  // Overview stats
  app.get("/api/dashboard/overview", async () => {
    const allTargets = await targets().find({}).toArray();
    const allStatuses = await targetStatus().find({}).toArray();
    const statusMap = new Map(allStatuses.map((s) => [s.target_id, s]));

    let healthy = 0;
    let down = 0;
    let unknown = 0;

    for (const t of allTargets) {
      const s = statusMap.get(t.id);
      if (!s || s.health === "unknown") unknown++;
      else if (s.health === "healthy") healthy++;
      else down++;
    }

    const activeOutages = await outages()
      .find({ resolved_at: null })
      .sort({ opened_at: -1 })
      .toArray();

    const recentFailures = await checkRuns()
      .find({ status: { $ne: "success" } })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray();

    return {
      total: allTargets.length,
      healthy,
      down,
      unknown,
      active_outages: activeOutages.map((o) => ({
        ...o,
        target_name: allTargets.find((t) => t.id === o.target_id)?.name ?? o.target_id,
      })),
      recent_failures: recentFailures.map((r) => ({
        ...r,
        target_name: allTargets.find((t) => t.id === r.target_id)?.name ?? r.target_id,
      })),
    };
  });

  // Services list (grouped by service_key)
  app.get("/api/dashboard/services", async () => {
    const allTargets = await targets().find({}).toArray();
    const allStatuses = await targetStatus().find({}).toArray();
    const statusMap = new Map(allStatuses.map((s) => [s.target_id, s]));
    const activeOutages = await outages().find({ resolved_at: null }).toArray();
    const outageTargetIds = new Set(activeOutages.map((o) => o.target_id));

    const serviceMap = new Map<string, {
      service_key: string;
      service_name: string;
      targets: number;
      healthy: number;
      down: number;
      unknown: number;
      nodes: Set<string>;
      has_outage: boolean;
    }>();

    for (const t of allTargets) {
      let svc = serviceMap.get(t.service_key);
      if (!svc) {
        svc = {
          service_key: t.service_key,
          service_name: t.service_name,
          targets: 0,
          healthy: 0,
          down: 0,
          unknown: 0,
          nodes: new Set(),
          has_outage: false,
        };
        serviceMap.set(t.service_key, svc);
      }

      svc.targets++;
      svc.nodes.add(t.node);

      const status = statusMap.get(t.id);
      if (!status || status.health === "unknown") svc.unknown++;
      else if (status.health === "healthy") svc.healthy++;
      else svc.down++;

      if (outageTargetIds.has(t.id)) svc.has_outage = true;
    }

    return Array.from(serviceMap.values()).map((s) => ({
      ...s,
      nodes: Array.from(s.nodes),
    }));
  });

  // Targets list with status
  app.get("/api/dashboard/targets", async () => {
    const allTargets = await targets().find({}).sort({ service_key: 1, name: 1 }).toArray();
    const allStatuses = await targetStatus().find({}).toArray();
    const statusMap = new Map(allStatuses.map((s) => [s.target_id, s]));

    return allTargets.map((t) => {
      const s = statusMap.get(t.id);
      return {
        id: t.id,
        name: t.name,
        class: t.class,
        service_key: t.service_key,
        service_name: t.service_name,
        resource_kind: t.resource_kind,
        check_kind: t.check_kind,
        node: t.node,
        enabled: t.enabled,
        health: s?.health ?? "unknown",
        last_check_at: s?.last_check_at ?? null,
        last_failure_reason: s?.last_failure_reason ?? null,
      };
    });
  });

  // Outages list
  app.get("/api/dashboard/outages", async () => {
    const allTargets = await targets().find({}).toArray();
    const targetMap = new Map(allTargets.map((t) => [t.id, t]));

    const allOutages = await outages()
      .find({})
      .sort({ opened_at: -1 })
      .limit(100)
      .toArray();

    return allOutages.map((o) => ({
      ...o,
      target_name: targetMap.get(o.target_id)?.name ?? o.target_id,
    }));
  });

  // Service detail
  app.get<{ Params: { key: string } }>("/api/dashboard/services/:key", async (request, reply) => {
    const { key } = request.params;
    const serviceTargets = await targets().find({ service_key: key }).toArray();

    if (serviceTargets.length === 0) {
      return reply.status(404).send({ error: "Service not found" });
    }

    const targetIds = serviceTargets.map((t) => t.id);
    const statuses = await targetStatus().find({ target_id: { $in: targetIds } }).toArray();
    const statusMap = new Map(statuses.map((s) => [s.target_id, s]));

    const serviceOutages = await outages()
      .find({ service_key: key })
      .sort({ opened_at: -1 })
      .limit(20)
      .toArray();

    return {
      service_key: key,
      service_name: serviceTargets[0].service_name,
      targets: serviceTargets.map((t) => {
        const s = statusMap.get(t.id);
        return {
          id: t.id,
          name: t.name,
          check_kind: t.check_kind,
          node: t.node,
          enabled: t.enabled,
          health: s?.health ?? "unknown",
          last_check_at: s?.last_check_at ?? null,
          last_failure_reason: s?.last_failure_reason ?? null,
        };
      }),
      outages: serviceOutages,
    };
  });

  // Target detail
  app.get<{ Params: { id: string } }>("/api/dashboard/targets/:id", async (request, reply) => {
    const target = await targets().findOne({ id: request.params.id });

    if (!target) {
      return reply.status(404).send({ error: "Target not found" });
    }

    const status = await targetStatus().findOne({ target_id: target.id });
    const recentRuns = await checkRuns()
      .find({ target_id: target.id })
      .sort({ created_at: -1 })
      .limit(25)
      .toArray();

    const targetOutages = await outages()
      .find({ target_id: target.id })
      .sort({ opened_at: -1 })
      .limit(20)
      .toArray();

    return {
      target,
      status: status ?? null,
      recent_runs: recentRuns,
      outages: targetOutages,
    };
  });
}
```

- [ ] **Step 2: Register dashboard routes in index.ts**

Add to `apps/monitor/src/server/index.ts`, after the existing route imports:

```typescript
import { dashboardRoutes } from "./api/dashboard.js";
```

After the last `app.register(...)` call:

```typescript
await app.register(dashboardRoutes);
```

- [ ] **Step 3: Verify TypeScript compiles and tests pass**

```bash
cd apps/monitor && npx tsc --noEmit && npm test
```

- [ ] **Step 4: Commit**

```bash
git add apps/monitor/src/server/api/dashboard.ts apps/monitor/src/server/index.ts
git commit -m "add dashboard read API routes"
```

---

### Task 2: Target CRUD API routes

**Files:**
- Modify: `apps/monitor/src/server/api/targets.ts`

- [ ] **Step 1: Add CRUD routes to targets.ts**

Add these routes to the existing `targetRoutes` function in `apps/monitor/src/server/api/targets.ts`. Add the imports at the top of the file:

```typescript
import { targets, targetStatus } from "../db/collections.js";
import { getDb } from "../db/client.js";
import { runCheck } from "../checks/runner.js";
import { CreateBasicTargetSchema, UpdateBasicTargetSchema } from "../schemas.js";
import { logAudit } from "../incidents/audit.js";
import crypto from "node:crypto";
```

Replace the existing `import { targets }` and `import { getDb }` lines with the above.

Then add these routes inside the `targetRoutes` function, after the existing routes:

```typescript
  // Create basic target
  app.post("/api/targets", async (request, reply) => {
    const parsed = CreateBasicTargetSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.issues });
    }

    const data = parsed.data;
    const id = `${data.service_key}-${data.check_kind}-${crypto.randomBytes(3).toString("hex")}`;
    const now = new Date();

    const target = {
      ...data,
      id,
      created_at: now,
      updated_at: now,
    };

    await targets().insertOne(target);

    // Create initial status
    await targetStatus().insertOne({
      target_id: id,
      health: "unknown",
      last_check_at: null,
      last_success_at: null,
      last_failure_at: null,
      last_failure_reason: null,
      consecutive_failures: 0,
      consecutive_successes: 0,
      updated_at: now,
    });

    await logAudit("create", "target", id, { name: data.name, check_kind: data.check_kind });

    return reply.status(201).send(target);
  });

  // Update basic target
  app.patch<{ Params: { id: string } }>("/api/targets/:id", async (request, reply) => {
    const target = await targets().findOne({ id: request.params.id });
    if (!target) {
      return reply.status(404).send({ error: "Target not found" });
    }
    if (target.class !== "basic") {
      return reply.status(403).send({ error: "Advanced targets cannot be edited via dashboard" });
    }

    const parsed = UpdateBasicTargetSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.issues });
    }

    const updates = { ...parsed.data, updated_at: new Date() };
    await targets().updateOne({ id: target.id }, { $set: updates });

    await logAudit("update", "target", target.id, updates);

    return { ok: true, id: target.id };
  });

  // Enable/disable target
  app.post<{ Params: { id: string }; Body: { enabled: boolean } }>(
    "/api/targets/:id/toggle",
    async (request, reply) => {
      const target = await targets().findOne({ id: request.params.id });
      if (!target) {
        return reply.status(404).send({ error: "Target not found" });
      }

      const enabled = (request.body as { enabled: boolean }).enabled;
      await targets().updateOne({ id: target.id }, { $set: { enabled, updated_at: new Date() } });

      await logAudit(enabled ? "enable" : "disable", "target", target.id);

      return { ok: true, id: target.id, enabled };
    },
  );
```

- [ ] **Step 2: Verify TypeScript compiles and tests pass**

```bash
cd apps/monitor && npx tsc --noEmit && npm test
```

- [ ] **Step 3: Commit**

```bash
git add apps/monitor/src/server/api/targets.ts
git commit -m "add basic target CRUD API routes"
```

---

### Task 3: shadcn/ui components + shared UI

**Files:**
- Create: `apps/monitor/src/web/components/ui/badge.tsx`
- Create: `apps/monitor/src/web/components/ui/card.tsx`
- Create: `apps/monitor/src/web/components/ui/input.tsx`
- Create: `apps/monitor/src/web/components/ui/label.tsx`
- Create: `apps/monitor/src/web/components/ui/select.tsx`
- Create: `apps/monitor/src/web/components/ui/table.tsx`
- Create: `apps/monitor/src/web/components/status-dot.tsx`
- Create: `apps/monitor/src/web/lib/api.ts`

- [ ] **Step 1: Add shadcn/ui components**

Use the shadcn/ui CLI or create these components manually following the shadcn/ui new-york style. Each component should use the `@/lib/utils` `cn()` helper and follow the established pattern from `button.tsx`.

Create `apps/monitor/src/web/components/ui/badge.tsx`:

```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        success: "border-transparent bg-emerald-500/15 text-emerald-400",
        warning: "border-transparent bg-amber-500/15 text-amber-400",
        danger: "border-transparent bg-red-500/15 text-red-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
```

Create `apps/monitor/src/web/components/ui/card.tsx`:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-100 shadow-sm", className)} {...props} />
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 p-6", className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("font-semibold leading-none tracking-tight", className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm text-zinc-400", className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-6 pt-0", className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent }
```

Create `apps/monitor/src/web/components/ui/input.tsx`:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-zinc-100 shadow-sm transition-colors placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
```

Create `apps/monitor/src/web/components/ui/label.tsx`:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("text-sm font-medium leading-none text-zinc-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)}
      {...props}
    />
  )
}

export { Label }
```

Create `apps/monitor/src/web/components/ui/select.tsx`:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1 text-sm text-zinc-100 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Select }
```

Create `apps/monitor/src/web/components/ui/table.tsx`:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return <thead className={cn("[&_tr]:border-b [&_tr]:border-zinc-800", className)} {...props} />
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return <tr className={cn("border-b border-zinc-800 transition-colors hover:bg-zinc-800/50", className)} {...props} />
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return <th className={cn("h-10 px-3 text-left align-middle font-medium text-zinc-400 [&:has([role=checkbox])]:pr-0", className)} {...props} />
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("p-3 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
```

- [ ] **Step 2: Create the status dot component**

Create `apps/monitor/src/web/components/status-dot.tsx`:

```tsx
import { cn } from "@/lib/utils"

const colors = {
  healthy: "bg-emerald-400",
  down: "bg-red-400",
  unknown: "bg-zinc-500",
} as const;

export function StatusDot({ health, className }: { health: string; className?: string }) {
  const color = colors[health as keyof typeof colors] ?? colors.unknown;
  return (
    <span className={cn("inline-block size-2.5 rounded-full", color, className)} />
  );
}
```

- [ ] **Step 3: Create API fetch helpers**

Create `apps/monitor/src/web/lib/api.ts`:

```typescript
const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getOverview: () => get<any>("/dashboard/overview"),
  getServices: () => get<any[]>("/dashboard/services"),
  getTargets: () => get<any[]>("/dashboard/targets"),
  getOutages: () => get<any[]>("/dashboard/outages"),
  getServiceDetail: (key: string) => get<any>(`/dashboard/services/${key}`),
  getTargetDetail: (id: string) => get<any>(`/dashboard/targets/${id}`),
  createTarget: (data: any) => post<any>("/targets", data),
  updateTarget: (id: string, data: any) => patch<any>(`/targets/${id}`, data),
  toggleTarget: (id: string, enabled: boolean) => post<any>(`/targets/${id}/toggle`, { enabled }),
  runTarget: (id: string) => post<any>(`/targets/${id}/run`),
};
```

- [ ] **Step 4: Commit**

```bash
git add apps/monitor/src/web/components/ apps/monitor/src/web/lib/api.ts
git commit -m "add shadcn components, status dot, and API helpers"
```

---

### Task 4: Overview and Services pages

**Files:**
- Create: `apps/monitor/src/web/pages/overview.tsx`
- Create: `apps/monitor/src/web/pages/services.tsx`
- Modify: `apps/monitor/src/web/app.tsx`

**IMPORTANT:** Use the `frontend-design` skill when implementing this task. The pages should look polished, not generic — use the dark zinc theme established in the app shell.

- [ ] **Step 1: Create the Overview page**

Create `apps/monitor/src/web/pages/overview.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/status-dot";
import { Activity, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";

export function OverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOverview().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-400">Loading...</div>;
  if (!data) return <div className="text-red-400">Failed to load overview</div>;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Overview</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Targets</CardTitle>
            <Activity className="size-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Healthy</CardTitle>
            <CheckCircle className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-400">{data.healthy}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Down</CardTitle>
            <AlertTriangle className="size-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">{data.down}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Unknown</CardTitle>
            <HelpCircle className="size-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-zinc-500">{data.unknown}</div>
          </CardContent>
        </Card>
      </div>

      {/* Active outages */}
      {data.active_outages.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Active Outages</h2>
          <div className="space-y-2">
            {data.active_outages.map((o: any) => (
              <Card key={o._id} className="border-red-900/50 bg-red-950/20">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <StatusDot health="down" />
                    <div>
                      <Link to={`/targets/${o.target_id}`} className="font-medium hover:underline">
                        {o.target_name}
                      </Link>
                      <p className="text-sm text-zinc-400">{o.last_failure_reason}</p>
                    </div>
                  </div>
                  <Badge variant="danger">
                    {timeAgo(o.opened_at)}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent failures */}
      {data.recent_failures.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Failures</h2>
          <div className="space-y-2">
            {data.recent_failures.map((r: any) => (
              <div key={r._id} className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Badge variant={r.status === "timeout" ? "warning" : "danger"} className="text-xs">
                    {r.status}
                  </Badge>
                  <Link to={`/targets/${r.target_id}`} className="text-sm hover:underline">
                    {r.target_name}
                  </Link>
                </div>
                <span className="text-xs text-zinc-500">{timeAgo(r.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

- [ ] **Step 2: Create the Services page**

Create `apps/monitor/src/web/pages/services.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusDot } from "@/components/status-dot";

export function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getServices().then(setServices).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Services</h1>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((svc) => {
          const health = svc.down > 0 ? "down" : svc.unknown === svc.targets ? "unknown" : "healthy";
          return (
            <Link key={svc.service_key} to={`/services/${svc.service_key}`}>
              <Card className="transition-colors hover:border-zinc-700">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{svc.service_name}</CardTitle>
                    <StatusDot health={health} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <span>{svc.targets} targets</span>
                    <span>·</span>
                    <span>{svc.nodes.join(", ")}</span>
                  </div>
                  <div className="flex gap-2">
                    {svc.healthy > 0 && <Badge variant="success">{svc.healthy} healthy</Badge>}
                    {svc.down > 0 && <Badge variant="danger">{svc.down} down</Badge>}
                    {svc.unknown > 0 && <Badge variant="outline">{svc.unknown} unknown</Badge>}
                  </div>
                  {svc.has_outage && (
                    <Badge variant="danger" className="mt-1">Active outage</Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Update app.tsx with routes and nav links**

Replace `apps/monitor/src/web/app.tsx` with:

```tsx
import { Routes, Route, Link, useLocation } from "react-router";
import { cn } from "@/lib/utils";
import { OverviewPage } from "@/pages/overview";
import { ServicesPage } from "@/pages/services";
import { TargetsPage } from "@/pages/targets";
import { OutagesPage } from "@/pages/outages";
import { ServiceDetailPage } from "@/pages/service-detail";
import { TargetDetailPage } from "@/pages/target-detail";
import { TargetFormPage } from "@/pages/target-form";

const navLinks = [
  { to: "/", label: "Overview" },
  { to: "/services", label: "Services" },
  { to: "/targets", label: "Targets" },
  { to: "/outages", label: "Outages" },
];

export function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-bold tracking-tight">Monitor</Link>
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "text-sm transition-colors hover:text-zinc-100",
                location.pathname === link.to ? "text-zinc-100" : "text-zinc-400"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/:key" element={<ServiceDetailPage />} />
          <Route path="/targets" element={<TargetsPage />} />
          <Route path="/targets/new" element={<TargetFormPage />} />
          <Route path="/targets/:id" element={<TargetDetailPage />} />
          <Route path="/targets/:id/edit" element={<TargetFormPage />} />
          <Route path="/outages" element={<OutagesPage />} />
        </Routes>
      </main>
    </div>
  );
}
```

Note: This imports pages that don't exist yet. They will be created in Tasks 5 and 6. For now, create placeholder files so TypeScript doesn't fail:

Create placeholder `apps/monitor/src/web/pages/targets.tsx`:
```tsx
export function TargetsPage() { return <div>Targets</div>; }
```

Create placeholder `apps/monitor/src/web/pages/outages.tsx`:
```tsx
export function OutagesPage() { return <div>Outages</div>; }
```

Create placeholder `apps/monitor/src/web/pages/service-detail.tsx`:
```tsx
export function ServiceDetailPage() { return <div>Service Detail</div>; }
```

Create placeholder `apps/monitor/src/web/pages/target-detail.tsx`:
```tsx
export function TargetDetailPage() { return <div>Target Detail</div>; }
```

Create placeholder `apps/monitor/src/web/pages/target-form.tsx`:
```tsx
export function TargetFormPage() { return <div>Target Form</div>; }
```

- [ ] **Step 4: Commit**

```bash
git add apps/monitor/src/web/
git commit -m "add Overview and Services pages with routing"
```

---

### Task 5: Targets and Outages pages

**Files:**
- Replace: `apps/monitor/src/web/pages/targets.tsx`
- Replace: `apps/monitor/src/web/pages/outages.tsx`

**IMPORTANT:** Use the `frontend-design` skill when implementing this task.

- [ ] **Step 1: Implement the Targets page**

Replace the placeholder `apps/monitor/src/web/pages/targets.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusDot } from "@/components/status-dot";
import { Plus } from "lucide-react";

export function TargetsPage() {
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ health: "all", class: "all" });

  useEffect(() => {
    api.getTargets().then(setTargets).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-400">Loading...</div>;

  const filtered = targets.filter((t) => {
    if (filter.health !== "all" && t.health !== filter.health) return false;
    if (filter.class !== "all" && t.class !== filter.class) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Targets</h1>
        <Link to="/targets/new">
          <Button size="sm"><Plus className="size-4" /> New Target</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filter.health} onChange={(e) => setFilter((f) => ({ ...f, health: e.target.value }))}>
          <option value="all">All Health</option>
          <option value="healthy">Healthy</option>
          <option value="down">Down</option>
          <option value="unknown">Unknown</option>
        </Select>
        <Select value={filter.class} onChange={(e) => setFilter((f) => ({ ...f, class: e.target.value }))}>
          <option value="all">All Classes</option>
          <option value="basic">Basic</option>
          <option value="advanced">Advanced</option>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Service</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Node</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Last Check</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((t) => (
            <TableRow key={t.id}>
              <TableCell>
                <StatusDot health={t.health} />
              </TableCell>
              <TableCell>
                <Link to={`/targets/${t.id}`} className="font-medium hover:underline">
                  {t.name}
                </Link>
                {!t.enabled && <Badge variant="outline" className="ml-2 text-xs">disabled</Badge>}
              </TableCell>
              <TableCell className="text-zinc-400">{t.service_name}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">{t.check_kind}</Badge>
              </TableCell>
              <TableCell className="text-zinc-400">{t.node}</TableCell>
              <TableCell>
                <Badge variant={t.class === "advanced" ? "outline" : "secondary"} className="text-xs">
                  {t.class}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-zinc-500">
                {t.last_check_at ? timeAgo(t.last_check_at) : "never"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
```

- [ ] **Step 2: Implement the Outages page**

Replace the placeholder `apps/monitor/src/web/pages/outages.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusDot } from "@/components/status-dot";

export function OutagesPage() {
  const [outages, setOutages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getOutages().then(setOutages).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-zinc-400">Loading...</div>;

  const active = outages.filter((o) => !o.resolved_at);
  const resolved = outages.filter((o) => o.resolved_at);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Outages</h1>

      {/* Active outages */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Active <Badge variant="danger" className="ml-2">{active.length}</Badge>
        </h2>
        {active.length === 0 ? (
          <p className="text-sm text-zinc-500">No active outages</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((o) => (
                <TableRow key={o._id}>
                  <TableCell><StatusDot health="down" /></TableCell>
                  <TableCell>
                    <Link to={`/targets/${o.target_id}`} className="font-medium hover:underline">{o.target_name}</Link>
                  </TableCell>
                  <TableCell className="text-zinc-400">{o.service_key}</TableCell>
                  <TableCell className="text-xs text-zinc-500">{timeAgo(o.opened_at)}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-zinc-400">{o.last_failure_reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Resolved outages */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recently Resolved</h2>
        {resolved.length === 0 ? (
          <p className="text-sm text-zinc-500">No resolved outages</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Target</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Opened</TableHead>
                <TableHead>Resolved</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resolved.map((o) => (
                <TableRow key={o._id}>
                  <TableCell>
                    <Link to={`/targets/${o.target_id}`} className="font-medium hover:underline">{o.target_name}</Link>
                  </TableCell>
                  <TableCell className="text-zinc-400">{o.service_key}</TableCell>
                  <TableCell className="text-xs text-zinc-500">{formatDate(o.opened_at)}</TableCell>
                  <TableCell className="text-xs text-zinc-500">{formatDate(o.resolved_at)}</TableCell>
                  <TableCell className="text-xs text-zinc-400">{duration(o.opened_at, o.resolved_at)}</TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-zinc-400">{o.last_failure_reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

function duration(start: string, end: string): string {
  const seconds = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/monitor/src/web/pages/targets.tsx apps/monitor/src/web/pages/outages.tsx
git commit -m "add Targets and Outages pages"
```

---

### Task 6: Detail pages (Service Detail + Target Detail)

**Files:**
- Replace: `apps/monitor/src/web/pages/service-detail.tsx`
- Replace: `apps/monitor/src/web/pages/target-detail.tsx`

**IMPORTANT:** Use the `frontend-design` skill when implementing this task.

- [ ] **Step 1: Implement Service Detail page**

Replace placeholder `apps/monitor/src/web/pages/service-detail.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusDot } from "@/components/status-dot";

export function ServiceDetailPage() {
  const { key } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (key) api.getServiceDetail(key).then(setData).finally(() => setLoading(false));
  }, [key]);

  if (loading) return <div className="text-zinc-400">Loading...</div>;
  if (!data) return <div className="text-red-400">Service not found</div>;

  const healthCounts = { healthy: 0, down: 0, unknown: 0 };
  for (const t of data.targets) {
    healthCounts[t.health as keyof typeof healthCounts]++;
  }
  const overallHealth = healthCounts.down > 0 ? "down" : healthCounts.unknown === data.targets.length ? "unknown" : "healthy";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <StatusDot health={overallHealth} className="size-3" />
        <h1 className="text-2xl font-bold tracking-tight">{data.service_name}</h1>
        <Badge variant="outline">{data.service_key}</Badge>
      </div>

      {/* Health summary */}
      <div className="flex gap-3">
        {healthCounts.healthy > 0 && <Badge variant="success">{healthCounts.healthy} healthy</Badge>}
        {healthCounts.down > 0 && <Badge variant="danger">{healthCounts.down} down</Badge>}
        {healthCounts.unknown > 0 && <Badge variant="outline">{healthCounts.unknown} unknown</Badge>}
      </div>

      {/* Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Targets</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Check</TableHead>
                <TableHead>Node</TableHead>
                <TableHead>Last Check</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.targets.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell><StatusDot health={t.health} /></TableCell>
                  <TableCell>
                    <Link to={`/targets/${t.id}`} className="font-medium hover:underline">{t.name}</Link>
                    {!t.enabled && <Badge variant="outline" className="ml-2 text-xs">disabled</Badge>}
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-xs">{t.check_kind}</Badge></TableCell>
                  <TableCell className="text-zinc-400">{t.node}</TableCell>
                  <TableCell className="text-xs text-zinc-500">
                    {t.last_check_at ? timeAgo(t.last_check_at) : "never"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Recent outages */}
      {data.outages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Outages</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.outages.map((o: any) => (
                  <TableRow key={o._id}>
                    <TableCell>
                      <Link to={`/targets/${o.target_id}`} className="hover:underline">{o.target_id}</Link>
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500">{new Date(o.opened_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {o.resolved_at ? new Date(o.resolved_at).toLocaleString() : <Badge variant="danger">Active</Badge>}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-zinc-400">{o.last_failure_reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
```

- [ ] **Step 2: Implement Target Detail page**

Replace placeholder `apps/monitor/src/web/pages/target-detail.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { StatusDot } from "@/components/status-dot";
import { Play, Pencil, Power } from "lucide-react";

export function TargetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = () => {
    if (id) api.getTargetDetail(id).then(setData).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="text-zinc-400">Loading...</div>;
  if (!data) return <div className="text-red-400">Target not found</div>;

  const { target, status, recent_runs, outages } = data;

  const handleRunNow = async () => {
    setRunning(true);
    try {
      await api.runTarget(target.id);
      load();
    } finally {
      setRunning(false);
    }
  };

  const handleToggle = async () => {
    await api.toggleTarget(target.id, !target.enabled);
    load();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusDot health={status?.health ?? "unknown"} className="size-3" />
          <h1 className="text-2xl font-bold tracking-tight">{target.name}</h1>
          <Badge variant={target.class === "advanced" ? "outline" : "secondary"}>{target.class}</Badge>
          {!target.enabled && <Badge variant="outline">disabled</Badge>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleRunNow} disabled={running || !target.enabled}>
            <Play className="size-4" /> {running ? "Running..." : "Run Now"}
          </Button>
          {target.class === "basic" && (
            <>
              <Link to={`/targets/${target.id}/edit`}>
                <Button size="sm" variant="outline"><Pencil className="size-4" /> Edit</Button>
              </Link>
              <Button size="sm" variant="outline" onClick={handleToggle}>
                <Power className="size-4" /> {target.enabled ? "Disable" : "Enable"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
          {target.class === "advanced" && (
            <CardDescription>This target is config-managed and read-only in the dashboard.</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            {[
              ["Service", target.service_name],
              ["Check Kind", target.check_kind],
              ["Resource", target.resource_kind],
              ["Node", target.node],
              ["Interval", `${target.interval_seconds}s`],
              ["Timeout", `${target.timeout_seconds}s`],
              ["Fail Threshold", target.failure_threshold],
              ["Recovery Threshold", target.recovery_threshold],
              ["Notifications", target.notify_on_failure ? "On" : "Off"],
            ].map(([label, value]) => (
              <div key={label as string}>
                <dt className="text-zinc-500">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          {Object.keys(target.metadata).length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-zinc-500">Metadata</p>
              <pre className="mt-1 rounded bg-zinc-800 p-3 text-xs text-zinc-300">
                {JSON.stringify(target.metadata, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              {[
                ["Health", status.health],
                ["Last Check", status.last_check_at ? new Date(status.last_check_at).toLocaleString() : "never"],
                ["Last Success", status.last_success_at ? new Date(status.last_success_at).toLocaleString() : "never"],
                ["Last Failure", status.last_failure_at ? new Date(status.last_failure_at).toLocaleString() : "never"],
                ["Consecutive Failures", status.consecutive_failures],
                ["Consecutive Successes", status.consecutive_successes],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-zinc-500">{label}</dt>
                  <dd className="font-medium">{String(value)}</dd>
                </div>
              ))}
            </dl>
            {status.last_failure_reason && (
              <div className="mt-3">
                <p className="text-sm text-zinc-500">Last Failure Reason</p>
                <p className="mt-1 text-sm text-red-400">{status.last_failure_reason}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent check runs */}
      {recent_runs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Check Runs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent_runs.map((r: any) => (
                  <TableRow key={r._id}>
                    <TableCell>
                      <Badge variant={r.status === "success" ? "success" : r.status === "timeout" ? "warning" : "danger"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-zinc-400">{r.duration_ms}ms</TableCell>
                    <TableCell className="max-w-sm truncate text-sm text-zinc-400">{r.message}</TableCell>
                    <TableCell className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Outage history */}
      {outages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outage History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opened</TableHead>
                  <TableHead>Resolved</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outages.map((o: any) => (
                  <TableRow key={o._id}>
                    <TableCell className="text-xs text-zinc-500">{new Date(o.opened_at).toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-zinc-500">
                      {o.resolved_at ? new Date(o.resolved_at).toLocaleString() : <Badge variant="danger">Active</Badge>}
                    </TableCell>
                    <TableCell className="max-w-sm truncate text-sm text-zinc-400">{o.last_failure_reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/monitor/src/web/pages/service-detail.tsx apps/monitor/src/web/pages/target-detail.tsx
git commit -m "add Service Detail and Target Detail pages"
```

---

### Task 7: Target create/edit form

**Files:**
- Replace: `apps/monitor/src/web/pages/target-form.tsx`

- [ ] **Step 1: Implement the target form page**

Replace placeholder `apps/monitor/src/web/pages/target-form.tsx`:

```tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { api } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const CHECK_KINDS = ["http", "tcp", "ping"] as const;

interface FormData {
  name: string;
  service_key: string;
  service_name: string;
  check_kind: string;
  node: string;
  interval_seconds: number;
  timeout_seconds: number;
  failure_threshold: number;
  recovery_threshold: number;
  notify_on_failure: boolean;
  metadata: string; // JSON string
}

const defaults: FormData = {
  name: "",
  service_key: "",
  service_name: "",
  check_kind: "http",
  node: "",
  interval_seconds: 60,
  timeout_seconds: 10,
  failure_threshold: 3,
  recovery_threshold: 2,
  notify_on_failure: true,
  metadata: "{}",
};

export function TargetFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormData>(defaults);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      api.getTargetDetail(id).then((data) => {
        const t = data.target;
        if (t.class !== "basic") {
          navigate(`/targets/${id}`);
          return;
        }
        setForm({
          name: t.name,
          service_key: t.service_key,
          service_name: t.service_name,
          check_kind: t.check_kind,
          node: t.node,
          interval_seconds: t.interval_seconds,
          timeout_seconds: t.timeout_seconds,
          failure_threshold: t.failure_threshold,
          recovery_threshold: t.recovery_threshold,
          notify_on_failure: t.notify_on_failure,
          metadata: JSON.stringify(t.metadata, null, 2),
        });
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let metadata: Record<string, unknown>;
      try {
        metadata = JSON.parse(form.metadata);
      } catch {
        setError("Metadata must be valid JSON");
        setSaving(false);
        return;
      }

      const payload = { ...form, metadata };

      if (isEdit && id) {
        await api.updateTarget(id, payload);
        navigate(`/targets/${id}`);
      } else {
        const result = await api.createTarget(payload);
        navigate(`/targets/${result.id}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to save target");
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof FormData, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  if (loading) return <div className="text-zinc-400">Loading...</div>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit Target" : "New Target"}</h1>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_kind">Check Type</Label>
                <Select id="check_kind" value={form.check_kind} onChange={(e) => update("check_kind", e.target.value)}>
                  {CHECK_KINDS.map((k) => <option key={k} value={k}>{k.toUpperCase()}</option>)}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service_key">Service Key</Label>
                <Input id="service_key" value={form.service_key} onChange={(e) => update("service_key", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service_name">Service Name</Label>
                <Input id="service_name" value={form.service_name} onChange={(e) => update("service_name", e.target.value)} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="node">Node</Label>
              <Input id="node" value={form.node} onChange={(e) => update("node", e.target.value)} required placeholder="e.g., vps1" />
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="interval">Interval (s)</Label>
                <Input id="interval" type="number" value={form.interval_seconds} onChange={(e) => update("interval_seconds", parseInt(e.target.value))} min={10} max={3600} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (s)</Label>
                <Input id="timeout" type="number" value={form.timeout_seconds} onChange={(e) => update("timeout_seconds", parseInt(e.target.value))} min={1} max={60} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fail_th">Fail Threshold</Label>
                <Input id="fail_th" type="number" value={form.failure_threshold} onChange={(e) => update("failure_threshold", parseInt(e.target.value))} min={1} max={20} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recov_th">Recovery Threshold</Label>
                <Input id="recov_th" type="number" value={form.recovery_threshold} onChange={(e) => update("recovery_threshold", parseInt(e.target.value))} min={1} max={20} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metadata">Metadata (JSON)</Label>
              <textarea
                id="metadata"
                value={form.metadata}
                onChange={(e) => update("metadata", e.target.value)}
                rows={4}
                className="flex w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
                placeholder='{"url": "https://example.com", "expected_status": 200}'
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="notify"
                checked={form.notify_on_failure}
                onChange={(e) => update("notify_on_failure", e.target.checked)}
                className="rounded border-zinc-700"
              />
              <Label htmlFor="notify">Send notifications on failure</Label>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-3">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : isEdit ? "Update Target" : "Create Target"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify the build works**

```bash
cd apps/monitor && npx tsc --noEmit && npm test
```

- [ ] **Step 3: Commit**

```bash
git add apps/monitor/src/web/pages/target-form.tsx
git commit -m "add basic target create and edit form"
```
