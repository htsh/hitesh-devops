import type { Target } from "../types.js";
import type { CheckResult } from "./types.js";

export async function checkHttp(target: Target): Promise<CheckResult> {
  const url = target.metadata.url as string;
  const expectedStatus = (target.metadata.expected_status as number) ?? 200;
  const timeoutMs = target.timeout_seconds * 1000;

  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    const duration_ms = Math.round(performance.now() - start);

    if (res.status === expectedStatus) {
      return {
        status: "success",
        duration_ms,
        message: `HTTP ${res.status}`,
        details: { status_code: res.status },
      };
    }
    return {
      status: "failure",
      duration_ms,
      message: `Expected ${expectedStatus}, got ${res.status}`,
      details: { status_code: res.status, expected: expectedStatus },
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    const duration_ms = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);

    if (controller.signal.aborted || (err instanceof DOMException && err.name === "AbortError")) {
      return { status: "timeout", duration_ms, message: `Timeout after ${timeoutMs}ms`, details: null };
    }
    return { status: "error", duration_ms, message, details: null };
  }
}
