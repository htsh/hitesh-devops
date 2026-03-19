import type { Target } from "../types.js";
import type { CheckResult } from "./types.js";
import { sshExec } from "./ssh.js";

export async function checkPm2(target: Target): Promise<CheckResult> {
  const start = performance.now();

  const result = await sshExec(target, "pm2 jlist");
  const duration_ms = Math.round(performance.now() - start);

  if (result.exitCode !== 0) {
    return {
      status: "error",
      duration_ms,
      message: `pm2 jlist failed: ${result.stderr || "exit " + result.exitCode}`,
      details: { stderr: result.stderr, exitCode: result.exitCode },
    };
  }

  try {
    const processes = JSON.parse(result.stdout) as Array<{ name: string; pm2_env: { status: string } }>;
    const stopped = processes.filter((p) => p.pm2_env.status !== "online");

    if (stopped.length === 0) {
      return {
        status: "success",
        duration_ms,
        message: `${processes.length} processes online`,
        details: { total: processes.length, processes: processes.map((p) => p.name) },
      };
    }
    return {
      status: "failure",
      duration_ms,
      message: `${stopped.length} processes not online: ${stopped.map((p) => p.name).join(", ")}`,
      details: { stopped: stopped.map((p) => ({ name: p.name, status: p.pm2_env.status })) },
    };
  } catch {
    return {
      status: "error",
      duration_ms,
      message: "Failed to parse pm2 output",
      details: { stdout: result.stdout.slice(0, 500) },
    };
  }
}
