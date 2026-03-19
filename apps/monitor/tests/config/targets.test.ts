import { describe, it, expect } from "vitest";
import { parseTargetsYaml, loadTargetsFromFile } from "../../src/server/config/targets.js";

const VALID_YAML = `
targets:
  - id: vps1-caddy
    name: Caddy on vps1
    class: advanced
    service_key: caddy-vps1
    service_name: Caddy
    resource_kind: api_service
    check_kind: http
    execution_mode: direct
    node: vps1
    enabled: true
    interval_seconds: 60
    timeout_seconds: 10
    failure_threshold: 3
    recovery_threshold: 2
    notify_on_failure: true
    metadata:
      url: "http://100.64.0.1:80"
      expected_status: 200
`;

const MINIMAL_YAML = `
targets: []
`;

const MISSING_REQUIRED_FIELD = `
targets:
  - id: bad-target
    name: Missing fields
`;

describe("parseTargetsYaml", () => {
  it("parses a valid target config", () => {
    const result = parseTargetsYaml(VALID_YAML);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("vps1-caddy");
    expect(result[0].class).toBe("advanced");
    expect(result[0].service_key).toBe("caddy-vps1");
    expect(result[0].metadata).toEqual({ url: "http://100.64.0.1:80", expected_status: 200 });
  });

  it("returns empty array for empty targets list", () => {
    const result = parseTargetsYaml(MINIMAL_YAML);
    expect(result).toEqual([]);
  });

  it("throws on missing required fields", () => {
    expect(() => parseTargetsYaml(MISSING_REQUIRED_FIELD)).toThrow();
  });
});

describe("loadTargetsFromFile", () => {
  it("loads the seed targets.yaml", () => {
    const targets = loadTargetsFromFile();
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.every((t) => t.class === "advanced")).toBe(true);
    expect(targets.every((t) => t.id && t.name && t.service_key)).toBe(true);
  });
});
