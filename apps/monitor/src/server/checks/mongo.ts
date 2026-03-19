import { execFile } from "node:child_process";
import type { Target } from "../types.js";
import type { CheckResult } from "./types.js";
import { sshExec } from "./ssh.js";

export async function checkMongo(target: Target): Promise<CheckResult> {
  const port = (target.metadata.port as number) ?? 27017;
  const start = performance.now();

  const cmd = `mongosh --port ${port} --quiet --eval "db.runCommand({ping:1})"`;

  // If execution_mode is direct, run locally; otherwise SSH
  if (target.execution_mode === "direct") {
    return new Promise<CheckResult>((resolve) => {
      execFile("bash", ["-c", cmd], { timeout: target.timeout_seconds * 1000 }, (err, stdout) => {
        const duration_ms = Math.round(performance.now() - start);
        if (!err && stdout.includes("ok")) {
          resolve({ status: "success", duration_ms, message: `Mongo ping OK on port ${port}`, details: { port } });
        } else {
          resolve({
            status: "failure",
            duration_ms,
            message: err?.message ?? "Mongo ping failed",
            details: { port, error: err?.message },
          });
        }
      });
    });
  }

  const result = await sshExec(target, cmd);
  const duration_ms = Math.round(performance.now() - start);

  if (result.exitCode === 0 && result.stdout.includes("ok")) {
    return { status: "success", duration_ms, message: `Mongo ping OK on port ${port}`, details: { port } };
  }
  return {
    status: "failure",
    duration_ms,
    message: result.stderr || `Mongo ping failed on port ${port}`,
    details: { port, stderr: result.stderr },
  };
}
