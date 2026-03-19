import { describe, it, expect } from "vitest";
import { checkTcp } from "../../src/server/checks/tcp.js";
import type { Target } from "../../src/server/types.js";

function makeTarget(metadata: Record<string, unknown>): Target {
  return {
    id: "test-tcp", name: "Test TCP", class: "basic", service_key: "test",
    service_name: "Test", resource_kind: "tcp_service", check_kind: "tcp",
    execution_mode: "direct", node: "test", enabled: true, interval_seconds: 60,
    timeout_seconds: 3, failure_threshold: 3, recovery_threshold: 2,
    notify_on_failure: true, metadata, created_at: new Date(), updated_at: new Date(),
  };
}

describe("checkTcp", () => {
  it("returns failure for a closed port", async () => {
    const target = makeTarget({ host: "127.0.0.1", port: 19999 });
    const result = await checkTcp(target);
    expect(["failure", "error"]).toContain(result.status);
  });
});
