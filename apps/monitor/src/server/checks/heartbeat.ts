import type { Target } from "../types.js";
import type { CheckResult } from "./types.js";
import { getDb } from "../db/client.js";

/**
 * Heartbeat check: checks whether an external system has sent a heartbeat
 * signal within the expected window. External systems POST to
 * /api/heartbeat/:target_id to record a beat. This checker reads the
 * last_beat_at timestamp from the heartbeats collection.
 */
export async function checkHeartbeat(target: Target): Promise<CheckResult> {
  const start = performance.now();
  const maxLateSeconds = (target.metadata.max_late_seconds as number) ?? target.interval_seconds * 2;

  const heartbeat = await getDb()
    .collection("heartbeats")
    .findOne({ target_id: target.id });

  const duration_ms = Math.round(performance.now() - start);

  if (!heartbeat || !heartbeat.last_beat_at) {
    return {
      status: "failure",
      duration_ms,
      message: "No heartbeat ever received",
      details: { max_late_seconds: maxLateSeconds },
    };
  }

  const lastBeat = heartbeat.last_beat_at as Date;
  const elapsedSec = (Date.now() - lastBeat.getTime()) / 1000;

  if (elapsedSec <= maxLateSeconds) {
    return {
      status: "success",
      duration_ms,
      message: `Last heartbeat ${Math.round(elapsedSec)}s ago`,
      details: { last_heartbeat: lastBeat.toISOString(), elapsed_seconds: Math.round(elapsedSec) },
    };
  }
  return {
    status: "failure",
    duration_ms,
    message: `Heartbeat late: ${Math.round(elapsedSec)}s ago (max ${maxLateSeconds}s)`,
    details: { last_heartbeat: lastBeat.toISOString(), elapsed_seconds: Math.round(elapsedSec), max_late_seconds: maxLateSeconds },
  };
}
