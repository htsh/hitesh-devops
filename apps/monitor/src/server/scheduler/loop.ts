import { targets, targetStatus } from "../db/collections.js";
import { runCheck } from "../checks/runner.js";
import type { Target } from "../types.js";

const TICK_INTERVAL_MS = 10_000; // check for due targets every 10s

let timer: ReturnType<typeof setInterval> | null = null;
let running = false;

export function isDue(target: Target, lastCheckAt: Date | null): boolean {
  if (!lastCheckAt) return true;
  const elapsed = (Date.now() - lastCheckAt.getTime()) / 1000;
  return elapsed >= target.interval_seconds;
}

async function tick(): Promise<void> {
  if (running) return; // prevent overlap
  running = true;

  try {
    const enabledTargets = await targets().find({ enabled: true }).toArray();
    const statuses = await targetStatus().find({}).toArray();
    const statusMap = new Map(statuses.map((s) => [s.target_id, s]));

    for (const target of enabledTargets) {
      const status = statusMap.get(target.id);
      const lastCheck = status?.last_check_at ?? null;

      if (!isDue(target, lastCheck)) continue;

      try {
        await runCheck(target);
      } catch (err) {
        console.error(`Check failed for ${target.id}:`, err);
      }
    }
  } catch (err) {
    console.error("Scheduler tick error:", err);
  } finally {
    running = false;
  }
}

export function startScheduler(): void {
  if (timer) return;
  console.log(`Scheduler started (tick every ${TICK_INTERVAL_MS / 1000}s)`);
  tick(); // run immediately on start
  timer = setInterval(tick, TICK_INTERVAL_MS);
}

export function stopScheduler(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("Scheduler stopped");
  }
}
