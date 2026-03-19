import type { Target } from "../types.js";
import type { CheckResult } from "./types.js";
import { sshExec } from "./ssh.js";

export async function checkRedis(target: Target): Promise<CheckResult> {
  const host = (target.metadata.host as string) ?? "127.0.0.1";
  const port = (target.metadata.port as number) ?? 6379;
  const start = performance.now();

  const result = await sshExec(target, `redis-cli -h ${host} -p ${port} ping`);
  const duration_ms = Math.round(performance.now() - start);

  if (result.exitCode === 0 && result.stdout.trim() === "PONG") {
    return { status: "success", duration_ms, message: "PONG", details: { host, port } };
  }
  return {
    status: "failure",
    duration_ms,
    message: result.stderr || result.stdout || "Redis ping failed",
    details: { host, port, stderr: result.stderr },
  };
}
