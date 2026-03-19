import type { FastifyInstance } from "fastify";
import { targets } from "../db/collections.js";
import { getDb } from "../db/client.js";
import { runCheck } from "../checks/runner.js";

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
}
