import { describe, it, expect } from "vitest";
import { computeNewStatus } from "../../src/server/checks/runner.js";
import type { TargetStatus } from "../../src/server/types.js";
import type { CheckResult } from "../../src/server/checks/types.js";

function makeStatus(overrides: Partial<TargetStatus> = {}): TargetStatus {
  return {
    target_id: "test",
    health: "unknown",
    last_check_at: null,
    last_success_at: null,
    last_failure_at: null,
    last_failure_reason: null,
    consecutive_failures: 0,
    consecutive_successes: 0,
    updated_at: new Date(),
    ...overrides,
  };
}

describe("computeNewStatus", () => {
  it("increments consecutive_successes on success", () => {
    const status = makeStatus({ consecutive_successes: 1, consecutive_failures: 2 });
    const result: CheckResult = { status: "success", duration_ms: 50, message: "OK", details: null };
    const updated = computeNewStatus(status, result, 3, 2);
    expect(updated.consecutive_successes).toBe(2);
    expect(updated.consecutive_failures).toBe(0);
  });

  it("increments consecutive_failures on failure", () => {
    const status = makeStatus({ consecutive_failures: 1, consecutive_successes: 3 });
    const result: CheckResult = { status: "failure", duration_ms: 50, message: "down", details: null };
    const updated = computeNewStatus(status, result, 3, 2);
    expect(updated.consecutive_failures).toBe(2);
    expect(updated.consecutive_successes).toBe(0);
  });

  it("transitions to down after failure_threshold", () => {
    const status = makeStatus({ health: "healthy", consecutive_failures: 2 });
    const result: CheckResult = { status: "failure", duration_ms: 50, message: "down", details: null };
    const updated = computeNewStatus(status, result, 3, 2);
    expect(updated.health).toBe("down");
    expect(updated.consecutive_failures).toBe(3);
  });

  it("transitions to healthy after recovery_threshold", () => {
    const status = makeStatus({ health: "down", consecutive_successes: 1 });
    const result: CheckResult = { status: "success", duration_ms: 50, message: "OK", details: null };
    const updated = computeNewStatus(status, result, 3, 2);
    expect(updated.health).toBe("healthy");
    expect(updated.consecutive_successes).toBe(2);
  });

  it("stays down if not enough consecutive successes", () => {
    const status = makeStatus({ health: "down", consecutive_successes: 0 });
    const result: CheckResult = { status: "success", duration_ms: 50, message: "OK", details: null };
    const updated = computeNewStatus(status, result, 3, 2);
    expect(updated.health).toBe("down");
    expect(updated.consecutive_successes).toBe(1);
  });

  it("stays healthy if not enough consecutive failures", () => {
    const status = makeStatus({ health: "healthy", consecutive_failures: 1 });
    const result: CheckResult = { status: "failure", duration_ms: 50, message: "err", details: null };
    const updated = computeNewStatus(status, result, 3, 2);
    expect(updated.health).toBe("healthy");
    expect(updated.consecutive_failures).toBe(2);
  });

  it("transitions unknown to healthy on recovery_threshold successes", () => {
    const status = makeStatus({ health: "unknown", consecutive_successes: 1 });
    const result: CheckResult = { status: "success", duration_ms: 50, message: "OK", details: null };
    const updated = computeNewStatus(status, result, 3, 2);
    expect(updated.health).toBe("healthy");
  });

  it("transitions unknown to down on failure_threshold failures", () => {
    const status = makeStatus({ health: "unknown", consecutive_failures: 2 });
    const result: CheckResult = { status: "failure", duration_ms: 50, message: "err", details: null };
    const updated = computeNewStatus(status, result, 3, 2);
    expect(updated.health).toBe("down");
  });

  it("treats timeout as failure", () => {
    const status = makeStatus({ health: "healthy", consecutive_failures: 0 });
    const result: CheckResult = { status: "timeout", duration_ms: 5000, message: "timeout", details: null };
    const updated = computeNewStatus(status, result, 3, 2);
    expect(updated.consecutive_failures).toBe(1);
    expect(updated.consecutive_successes).toBe(0);
  });
});
