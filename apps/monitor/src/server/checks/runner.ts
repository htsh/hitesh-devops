import type { Target, TargetStatus, HealthState } from "../types.js";
import type { CheckResult } from "./types.js";
import { getChecker } from "./registry.js";
import { checkRuns, targetStatus } from "../db/collections.js";
import { handleIncident } from "../incidents/handler.js";

export function computeNewStatus(
  current: TargetStatus,
  result: CheckResult,
  failureThreshold: number,
  recoveryThreshold: number,
): TargetStatus {
  const now = new Date();
  const isSuccess = result.status === "success";

  const consecutive_successes = isSuccess ? current.consecutive_successes + 1 : 0;
  const consecutive_failures = isSuccess ? 0 : current.consecutive_failures + 1;

  let health: HealthState = current.health;

  if (consecutive_failures >= failureThreshold && health !== "down") {
    health = "down";
  } else if (consecutive_successes >= recoveryThreshold && health !== "healthy") {
    health = "healthy";
  }

  return {
    ...current,
    health,
    last_check_at: now,
    last_success_at: isSuccess ? now : current.last_success_at,
    last_failure_at: isSuccess ? current.last_failure_at : now,
    last_failure_reason: isSuccess ? current.last_failure_reason : result.message,
    consecutive_successes,
    consecutive_failures,
    updated_at: now,
  };
}

export async function runCheck(target: Target): Promise<{ result: CheckResult; previousHealth: HealthState; newHealth: HealthState }> {
  const checker = getChecker(target.check_kind);
  if (!checker) {
    const result: CheckResult = {
      status: "error",
      duration_ms: 0,
      message: `No checker for check_kind: ${target.check_kind}`,
      details: null,
    };
    return { result, previousHealth: "unknown", newHealth: "unknown" };
  }

  const result = await checker(target);

  // Persist the check run
  await checkRuns().insertOne({
    target_id: target.id,
    status: result.status,
    duration_ms: result.duration_ms,
    message: result.message,
    details: result.details,
    created_at: new Date(),
  });

  // Get or create current status
  let currentStatus = await targetStatus().findOne({ target_id: target.id });
  if (!currentStatus) {
    const now = new Date();
    const initial = {
      target_id: target.id,
      health: "unknown" as const,
      last_check_at: null,
      last_success_at: null,
      last_failure_at: null,
      last_failure_reason: null,
      consecutive_failures: 0,
      consecutive_successes: 0,
      updated_at: now,
    };
    await targetStatus().insertOne(initial);
    currentStatus = { ...initial, _id: undefined as any };
  }

  const previousHealth = currentStatus.health;
  const newStatus = computeNewStatus(currentStatus, result, target.failure_threshold, target.recovery_threshold);

  // Update status in DB
  const { _id, ...statusWithoutId } = newStatus;
  await targetStatus().updateOne(
    { target_id: target.id },
    { $set: statusWithoutId },
  );

  // Handle incident lifecycle (outage open/resolve + notifications)
  await handleIncident(target, previousHealth, newStatus.health, result.message);

  return { result, previousHealth, newHealth: newStatus.health };
}
