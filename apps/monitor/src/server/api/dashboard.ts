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

  // Services list
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
    const targetNameMap = new Map(serviceTargets.map((t) => [t.id, t.name]));

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
      outages: serviceOutages.map((o) => ({
        ...o,
        target_name: targetNameMap.get(o.target_id) ?? o.target_id,
      })),
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
