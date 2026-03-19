import type { ObjectId } from "mongodb";

// --- Enums / unions ---

export type TargetClass = "basic" | "advanced";

export type ResourceKind =
  | "api_service"
  | "tcp_service"
  | "host"
  | "pm2_process"
  | "docker_container"
  | "mongo_instance"
  | "mongo_replica_set"
  | "redis_instance"
  | "cron_job";

export type CheckKind =
  | "http"
  | "tcp"
  | "ping"
  | "pm2_status"
  | "docker_status"
  | "mongo_ping"
  | "mongo_rs"
  | "redis_ping"
  | "heartbeat"
  | "ssh_command";

export type ExecutionMode = "direct" | "ssh";

export type HealthState = "healthy" | "down" | "unknown";

// --- Core entities ---

export interface Target {
  _id?: ObjectId;
  id: string;
  name: string;
  class: TargetClass;
  service_key: string;
  service_name: string;
  resource_kind: ResourceKind;
  check_kind: CheckKind;
  execution_mode: ExecutionMode;
  node: string;
  enabled: boolean;
  interval_seconds: number;
  timeout_seconds: number;
  failure_threshold: number;
  recovery_threshold: number;
  notify_on_failure: boolean;
  metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export interface TargetStatus {
  _id?: ObjectId;
  target_id: string;
  health: HealthState;
  last_check_at: Date | null;
  last_success_at: Date | null;
  last_failure_at: Date | null;
  last_failure_reason: string | null;
  consecutive_failures: number;
  consecutive_successes: number;
  updated_at: Date;
}

export interface CheckRun {
  _id?: ObjectId;
  target_id: string;
  status: "success" | "failure" | "timeout" | "error";
  duration_ms: number;
  message: string | null;
  details: Record<string, unknown> | null;
  created_at: Date;
}

export interface Outage {
  _id?: ObjectId;
  target_id: string;
  service_key: string;
  opened_at: Date;
  resolved_at: Date | null;
  last_failure_reason: string | null;
  notified_open: boolean;
  notified_resolved: boolean;
}

export interface AuditEvent {
  _id?: ObjectId;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, unknown> | null;
  created_at: Date;
}
