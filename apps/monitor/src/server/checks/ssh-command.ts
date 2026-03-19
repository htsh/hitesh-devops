import type { Target } from "../types.js";
import type { CheckResult } from "./types.js";
import { sshExec } from "./ssh.js";

export async function checkSshCommand(target: Target): Promise<CheckResult> {
  const command = target.metadata.command as string;
  const expectedOutput = target.metadata.expected_output as string | undefined;
  const start = performance.now();

  if (!command) {
    return { status: "error", duration_ms: 0, message: "No command specified in metadata", details: null };
  }

  const result = await sshExec(target, command);
  const duration_ms = Math.round(performance.now() - start);

  if (result.exitCode !== 0) {
    return {
      status: "failure",
      duration_ms,
      message: `Exit ${result.exitCode}: ${result.stderr || result.stdout}`.slice(0, 500),
      details: { exitCode: result.exitCode, stderr: result.stderr, stdout: result.stdout.slice(0, 500) },
    };
  }

  if (expectedOutput && !result.stdout.includes(expectedOutput)) {
    return {
      status: "failure",
      duration_ms,
      message: `Output did not contain "${expectedOutput}"`,
      details: { stdout: result.stdout.slice(0, 500), expected: expectedOutput },
    };
  }

  return {
    status: "success",
    duration_ms,
    message: `Command OK (exit 0)`,
    details: { stdout: result.stdout.slice(0, 500) },
  };
}
