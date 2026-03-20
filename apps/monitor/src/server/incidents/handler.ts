import type { Target, HealthState } from "../types.js";
import {
  shouldOpenOutage,
  shouldResolveOutage,
  openOutage,
  resolveOutage,
} from "./outages.js";
import {
  formatOutageMessage,
  formatRecoveryMessage,
  sendNtfy,
} from "./notifier.js";
import { outages } from "../db/collections.js";

export async function handleIncident(
  target: Target,
  previousHealth: HealthState,
  newHealth: HealthState,
  failureReason: string | null,
): Promise<void> {
  if (shouldOpenOutage(previousHealth, newHealth)) {
    await openOutage(target.id, target.service_key, failureReason);

    if (target.notify_on_failure) {
      const msg = formatOutageMessage(target.id, target.service_key, failureReason);
      const sent = await sendNtfy(msg);
      if (sent) {
        await outages().updateOne(
          { target_id: target.id, resolved_at: null },
          { $set: { notified_open: true } },
        );
      }
    }

    console.log(`Outage opened: ${target.id}`);
    return;
  }

  if (shouldResolveOutage(previousHealth, newHealth)) {
    const activeOutage = await outages().findOne({
      target_id: target.id,
      resolved_at: null,
    });

    const resolved = await resolveOutage(target.id);

    if (resolved && target.notify_on_failure) {
      const downtimeSeconds = activeOutage
        ? Math.round((Date.now() - activeOutage.opened_at.getTime()) / 1000)
        : 0;

      const msg = formatRecoveryMessage(target.id, target.service_key, downtimeSeconds);
      const sent = await sendNtfy(msg);
      if (sent && activeOutage) {
        await outages().updateOne(
          { _id: activeOutage._id },
          { $set: { notified_resolved: true } },
        );
      }
    }

    console.log(`Outage resolved: ${target.id}`);
  }
}
