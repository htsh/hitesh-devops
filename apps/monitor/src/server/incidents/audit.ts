import { auditEvents } from "../db/collections.js";

export async function logAudit(
  action: string,
  entityType: string,
  entityId: string,
  details: Record<string, unknown> | null = null,
): Promise<void> {
  await auditEvents().insertOne({
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
    created_at: new Date(),
  });
}
