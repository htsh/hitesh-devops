import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { Target } from "../types.js";

// Resolve from project root (apps/monitor/) not from compiled output dir
const PROJECT_ROOT = path.resolve(
  new URL(".", import.meta.url).pathname,
  // Works from both src/server/config/ and dist/server/config/
  "../../.."
);

const REQUIRED_FIELDS = [
  "id",
  "name",
  "class",
  "service_key",
  "service_name",
  "resource_kind",
  "check_kind",
  "execution_mode",
  "node",
] as const;

interface RawTargetConfig {
  targets: Record<string, unknown>[];
}

export function parseTargetsYaml(content: string): Omit<Target, "_id" | "created_at" | "updated_at">[] {
  const doc = yaml.load(content) as RawTargetConfig;
  const raw = doc?.targets ?? [];

  return raw.map((entry, i) => {
    for (const field of REQUIRED_FIELDS) {
      if (entry[field] === undefined || entry[field] === null) {
        throw new Error(`Target at index ${i} missing required field: ${field}`);
      }
    }

    return {
      id: entry.id as string,
      name: entry.name as string,
      class: entry.class as Target["class"],
      service_key: entry.service_key as string,
      service_name: entry.service_name as string,
      resource_kind: entry.resource_kind as Target["resource_kind"],
      check_kind: entry.check_kind as Target["check_kind"],
      execution_mode: entry.execution_mode as Target["execution_mode"],
      node: entry.node as string,
      enabled: entry.enabled !== false,
      interval_seconds: (entry.interval_seconds as number) ?? 60,
      timeout_seconds: (entry.timeout_seconds as number) ?? 10,
      failure_threshold: (entry.failure_threshold as number) ?? 3,
      recovery_threshold: (entry.recovery_threshold as number) ?? 2,
      notify_on_failure: entry.notify_on_failure !== false,
      metadata: (entry.metadata as Record<string, unknown>) ?? {},
    };
  });
}

export function loadTargetsFromFile(): Omit<Target, "_id" | "created_at" | "updated_at">[] {
  const configPath = path.resolve(PROJECT_ROOT, "config/targets.yaml");
  if (!fs.existsSync(configPath)) {
    console.warn(`No advanced target config found at ${configPath}`);
    return [];
  }
  const content = fs.readFileSync(configPath, "utf-8");
  return parseTargetsYaml(content);
}
