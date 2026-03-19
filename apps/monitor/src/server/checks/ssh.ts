import { execFile } from "node:child_process";
import type { Target } from "../types.js";

export interface SshResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

// Node hosts from environment: SSH_HOST_vps1=100.64.0.1, etc.
// Falls back to the node name if no env var is set.
export function getNodeHost(node: string): string {
  return process.env[`SSH_HOST_${node}`] ?? node;
}

export async function sshExec(
  target: Target,
  command: string,
): Promise<SshResult> {
  const host = getNodeHost(target.node);
  const timeoutMs = target.timeout_seconds * 1000;

  return new Promise<SshResult>((resolve) => {
    const proc = execFile(
      "ssh",
      [
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", `ConnectTimeout=${target.timeout_seconds}`,
        "-o", "BatchMode=yes",
        host,
        command,
      ],
      { timeout: timeoutMs + 5000 },
      (err, stdout, stderr) => {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: err ? (err as NodeJS.ErrnoException & { code?: number }).code ?? 1 : 0,
        });
      },
    );
  });
}
