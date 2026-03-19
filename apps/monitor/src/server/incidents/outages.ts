import type { HealthState } from "../types.js";
import { outages } from "../db/collections.js";

export function shouldOpenOutage(
  previousHealth: HealthState,
  newHealth: HealthState,
): boolean {
  return newHealth === "down" && previousHealth !== "down";
}

export function shouldResolveOutage(
  previousHealth: HealthState,
  newHealth: HealthState,
): boolean {
  return previousHealth === "down" && newHealth === "healthy";
}

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

export async function resolveOutage(targetId: string): Promise<boolean> {
  const now = new Date();
  const result = await outages().updateOne(
    { target_id: targetId, resolved_at: null },
    { $set: { resolved_at: now } },
  );
  return result.modifiedCount > 0;
}
