import type { FastifyInstance } from "fastify";
import { targets, targetStatus } from "../db/collections.js";
import { getDb } from "../db/client.js";
import { runCheck } from "../checks/runner.js";
import { CreateBasicTargetSchema, UpdateBasicTargetSchema } from "../schemas.js";
import { logAudit } from "../incidents/audit.js";
import crypto from "node:crypto";

export async function targetRoutes(app: FastifyInstance) {
  // Heartbeat ingestion — external systems POST here to record a beat
  app.post<{ Params: { targetId: string } }>("/api/heartbeat/:targetId", async (request, reply) => {
    const { targetId } = request.params;
    const target = await targets().findOne({ id: targetId, check_kind: "heartbeat" });

    if (!target) {
      return reply.status(404).send({ error: "Heartbeat target not found" });
    }

    await getDb().collection("heartbeats").updateOne(
      { target_id: targetId },
      { $set: { target_id: targetId, last_beat_at: new Date() } },
      { upsert: true },
    );

    return { ok: true, target_id: targetId, recorded_at: new Date().toISOString() };
  });

  // Run Now — trigger a manual check for a target
  app.post<{ Params: { id: string } }>("/api/targets/:id/run", async (request, reply) => {
    const target = await targets().findOne({ id: request.params.id });

    if (!target) {
      return reply.status(404).send({ error: "Target not found" });
    }

    if (!target.enabled) {
      return reply.status(400).send({ error: "Target is disabled" });
    }

    const { result, previousHealth, newHealth } = await runCheck(target);

    return {
      target_id: target.id,
      result,
      previous_health: previousHealth,
      new_health: newHealth,
    };
  });

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
}
