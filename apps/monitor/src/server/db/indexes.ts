import { targets, targetStatus, checkRuns, outages, auditEvents } from "./collections.js";

export async function ensureIndexes(): Promise<void> {
  // targets
  await targets().createIndex({ id: 1 }, { unique: true });
  await targets().createIndex({ service_key: 1 });
  await targets().createIndex({ enabled: 1 });
  await targets().createIndex({ class: 1 });

  // target_status
  await targetStatus().createIndex({ target_id: 1 }, { unique: true });
  await targetStatus().createIndex({ health: 1 });

  // check_runs — TTL: 90 days
  await checkRuns().createIndex(
    { created_at: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60 }
  );
  await checkRuns().createIndex({ target_id: 1, created_at: -1 });

  // outages
  await outages().createIndex({ target_id: 1 });
  await outages().createIndex({ resolved_at: 1, opened_at: -1 });
  await outages().createIndex({ service_key: 1 });

  // audit_events
  await auditEvents().createIndex({ created_at: -1 });
  await auditEvents().createIndex({ entity_type: 1, entity_id: 1 });

  console.log("Database indexes ensured");
}
