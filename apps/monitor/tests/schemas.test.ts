import { describe, it, expect } from "vitest";
import { CreateBasicTargetSchema, UpdateBasicTargetSchema } from "../src/server/schemas.js";

describe("CreateBasicTargetSchema", () => {
  it("validates a valid basic target", () => {
    const result = CreateBasicTargetSchema.safeParse({
      name: "My HTTP Check",
      service_key: "my-service",
      service_name: "My Service",
      check_kind: "http",
      node: "vps1",
      metadata: { url: "https://example.com", expected_status: 200 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.class).toBe("basic");
      expect(result.data.interval_seconds).toBe(60);
      expect(result.data.failure_threshold).toBe(3);
    }
  });

  it("rejects invalid check_kind", () => {
    const result = CreateBasicTargetSchema.safeParse({
      name: "Bad Check",
      service_key: "svc",
      service_name: "Svc",
      check_kind: "pm2_status",
      node: "vps1",
      metadata: {},
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = CreateBasicTargetSchema.safeParse({ name: "Only name" });
    expect(result.success).toBe(false);
  });
});

describe("UpdateBasicTargetSchema", () => {
  it("allows partial updates", () => {
    const result = UpdateBasicTargetSchema.safeParse({
      name: "Updated Name",
      enabled: false,
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty update", () => {
    const result = UpdateBasicTargetSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
