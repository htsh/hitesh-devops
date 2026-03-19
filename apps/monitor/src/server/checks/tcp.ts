import net from "node:net";
import type { Target } from "../types.js";
import type { CheckResult } from "./types.js";

export async function checkTcp(target: Target): Promise<CheckResult> {
  const host = target.metadata.host as string;
  const port = target.metadata.port as number;
  const timeoutMs = target.timeout_seconds * 1000;

  const start = performance.now();

  return new Promise<CheckResult>((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.on("connect", () => {
      const duration_ms = Math.round(performance.now() - start);
      socket.destroy();
      resolve({ status: "success", duration_ms, message: `TCP ${host}:${port} open`, details: { host, port } });
    });

    socket.on("timeout", () => {
      const duration_ms = Math.round(performance.now() - start);
      socket.destroy();
      resolve({ status: "timeout", duration_ms, message: `TCP ${host}:${port} timeout after ${timeoutMs}ms`, details: null });
    });

    socket.on("error", (err) => {
      const duration_ms = Math.round(performance.now() - start);
      socket.destroy();
      resolve({ status: "failure", duration_ms, message: `TCP ${host}:${port} — ${err.message}`, details: { error: err.message } });
    });

    socket.connect(port, host);
  });
}
