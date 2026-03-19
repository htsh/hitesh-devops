import type { Target } from "../types.js";
import type { CheckResult } from "./types.js";
import { sshExec } from "./ssh.js";

export async function checkDocker(target: Target): Promise<CheckResult> {
  const container = target.metadata.container as string | undefined;
  const start = performance.now();

  const cmd = container
    ? `docker inspect --format='{{.State.Status}}' ${container}`
    : "docker ps --format='{{.Names}}: {{.Status}}' --no-trunc";

  const result = await sshExec(target, cmd);
  const duration_ms = Math.round(performance.now() - start);

  if (result.exitCode !== 0) {
    return {
      status: "failure",
      duration_ms,
      message: result.stderr || `docker check failed (exit ${result.exitCode})`,
      details: { stderr: result.stderr },
    };
  }

  if (container) {
    const status = result.stdout.trim();
    if (status === "running") {
      return { status: "success", duration_ms, message: `${container}: running`, details: { container, status } };
    }
    return { status: "failure", duration_ms, message: `${container}: ${status}`, details: { container, status } };
  }

  return {
    status: "success",
    duration_ms,
    message: `docker ps OK`,
    details: { output: result.stdout.slice(0, 500) },
  };
}
