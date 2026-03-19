import { execFile } from "node:child_process";
import type { Target } from "../types.js";
import type { CheckResult } from "./types.js";

export async function checkPing(target: Target): Promise<CheckResult> {
  const host = target.metadata.host as string;
  const timeoutSec = target.timeout_seconds;

  const start = performance.now();

  return new Promise<CheckResult>((resolve) => {
    execFile("ping", ["-c", "1", "-W", String(timeoutSec), host], (err, stdout) => {
      const duration_ms = Math.round(performance.now() - start);

      if (!err) {
        const timeMatch = stdout.match(/time[=<]([\d.]+)/);
        const rtt = timeMatch ? parseFloat(timeMatch[1]) : null;
        resolve({ status: "success", duration_ms, message: rtt ? `${rtt}ms` : "reachable", details: { host, rtt_ms: rtt } });
      } else {
        resolve({ status: "failure", duration_ms, message: `${host} unreachable`, details: { host, error: err.message } });
      }
    });
  });
}
