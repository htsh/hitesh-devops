import { z } from "zod";

const BASIC_CHECK_KINDS = ["http", "tcp", "ping"] as const;

export const CreateBasicTargetSchema = z.object({
  name: z.string().min(1).max(200),
  service_key: z.string().min(1).max(100),
  service_name: z.string().min(1).max(200),
  check_kind: z.enum(BASIC_CHECK_KINDS),
  node: z.string().min(1),
  enabled: z.boolean().default(true),
  interval_seconds: z.number().int().min(10).max(3600).default(60),
  timeout_seconds: z.number().int().min(1).max(60).default(10),
  failure_threshold: z.number().int().min(1).max(20).default(3),
  recovery_threshold: z.number().int().min(1).max(20).default(2),
  notify_on_failure: z.boolean().default(true),
  metadata: z.record(z.string(), z.any()).default({}),
}).transform((data) => ({
  ...data,
  class: "basic" as const,
  resource_kind: data.check_kind === "http" ? "api_service" as const
    : data.check_kind === "tcp" ? "tcp_service" as const
    : "host" as const,
  execution_mode: "direct" as const,
}));

export const UpdateBasicTargetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  service_key: z.string().min(1).max(100).optional(),
  service_name: z.string().min(1).max(200).optional(),
  check_kind: z.enum(BASIC_CHECK_KINDS).optional(),
  node: z.string().min(1).optional(),
  enabled: z.boolean().optional(),
  interval_seconds: z.number().int().min(10).max(3600).optional(),
  timeout_seconds: z.number().int().min(1).max(60).optional(),
  failure_threshold: z.number().int().min(1).max(20).optional(),
  recovery_threshold: z.number().int().min(1).max(20).optional(),
  notify_on_failure: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided",
});

export type CreateBasicTarget = z.infer<typeof CreateBasicTargetSchema>;
export type UpdateBasicTarget = z.infer<typeof UpdateBasicTargetSchema>;
