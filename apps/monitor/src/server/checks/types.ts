import type { Target } from "../types.js";

export interface CheckResult {
  status: "success" | "failure" | "timeout" | "error";
  duration_ms: number;
  message: string | null;
  details: Record<string, unknown> | null;
}

export type CheckerFn = (target: Target) => Promise<CheckResult>;
