import { targets, targetStatus } from "./collections.js";
import { loadTargetsFromFile } from "../config/targets.js";
import type { Target, TargetStatus } from "../types.js";

export async function seedAdvancedTargets(): Promise<number> {
  const configs = loadTargetsFromFile();
  let upserted = 0;

  for (const cfg of configs) {
    const now = new Date();

    await targets().updateOne(
      { id: cfg.id },
      {
        $set: {
          ...cfg,
          updated_at: now,
        },
        $setOnInsert: {
          created_at: now,
        },
      },
      { upsert: true }
    );

    // Ensure a target_status doc exists
    await targetStatus().updateOne(
      { target_id: cfg.id },
      {
        $setOnInsert: {
          target_id: cfg.id,
          health: "unknown",
          last_check_at: null,
          last_success_at: null,
          last_failure_at: null,
          last_failure_reason: null,
          consecutive_failures: 0,
          consecutive_successes: 0,
          updated_at: now,
        },
      },
      { upsert: true }
    );

    upserted++;
  }

  console.log(`Seeded ${upserted} advanced targets`);
  return upserted;
}
