import type { Collection } from "mongodb";
import { getDb } from "./client.js";
import type {
  Target,
  TargetStatus,
  CheckRun,
  Outage,
  AuditEvent,
} from "../types.js";

export function targets(): Collection<Target> {
  return getDb().collection<Target>("targets");
}

export function targetStatus(): Collection<TargetStatus> {
  return getDb().collection<TargetStatus>("target_status");
}

export function checkRuns(): Collection<CheckRun> {
  return getDb().collection<CheckRun>("check_runs");
}

export function outages(): Collection<Outage> {
  return getDb().collection<Outage>("outages");
}

export function auditEvents(): Collection<AuditEvent> {
  return getDb().collection<AuditEvent>("audit_events");
}
