import { describe, it, expect } from "vitest";
import { isDue } from "../../src/server/scheduler/loop.js";
import type { Target } from "../../src/server/types.js";
import type { TargetStatus } from "../../src/server/types.js";

function makeTarget(interval: number): Target {
  return {
    id: "test",
    name: "Test",
    class: "basic",
    service_key: "test",
    service_name: "Test",
    resource_kind: "api_service",
    check_kind: "http",
    execution_mode: "direct",
    node: "test",
    enabled: true,
    interval_seconds: interval,
    timeout_seconds: 10,
    failure_threshold: 3,
    recovery_threshold: 2,
    notify_on_failure: true,
    metadata: {},
    created_at: new Date(),
    updated_at: new Date(),
  };
}

describe("isDue", () => {
  it("returns true when no last check exists", () => {
    expect(isDue(makeTarget(60), null)).toBe(true);
  });

  it("returns true when enough time has passed", () => {
    const lastCheck = new Date(Date.now() - 120_000); // 2 minutes ago
    expect(isDue(makeTarget(60), lastCheck)).toBe(true);
  });

  it("returns false when not enough time has passed", () => {
    const lastCheck = new Date(Date.now() - 10_000); // 10 seconds ago
    expect(isDue(makeTarget(60), lastCheck)).toBe(false);
  });
});
