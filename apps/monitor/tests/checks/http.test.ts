import { describe, it, expect } from "vitest";
import { checkHttp } from "../../src/server/checks/http.js";
import type { Target } from "../../src/server/types.js";

function makeTarget(metadata: Record<string, unknown>): Target {
  return {
    id: "test-http", name: "Test HTTP", class: "basic", service_key: "test",
    service_name: "Test", resource_kind: "api_service", check_kind: "http",
    execution_mode: "direct", node: "test", enabled: true, interval_seconds: 60,
    timeout_seconds: 5, failure_threshold: 3, recovery_threshold: 2,
    notify_on_failure: true, metadata, created_at: new Date(), updated_at: new Date(),
  };
}

describe("checkHttp", () => {
  it("returns success for a reachable URL", async () => {
    const target = makeTarget({ url: "https://httpbin.org/status/200", expected_status: 200 });
    const result = await checkHttp(target);
    expect(result.status).toBe("success");
    expect(result.duration_ms).toBeGreaterThan(0);
  });

  it("returns failure for wrong status code", async () => {
    const target = makeTarget({ url: "https://httpbin.org/status/404", expected_status: 200 });
    const result = await checkHttp(target);
    expect(result.status).toBe("failure");
  });

  it("returns failure for unreachable URL", async () => {
    const target = makeTarget({ url: "http://192.0.2.1:1", expected_status: 200 });
    target.timeout_seconds = 2;
    const result = await checkHttp(target);
    expect(["failure", "timeout", "error"]).toContain(result.status);
  });
});
