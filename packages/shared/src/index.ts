import { z } from "zod";

export const flowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  typeVersion: z.number().int().positive(),
  name: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }),
  disabled: z.boolean().optional(),
  config: z.record(z.unknown()).default({}),
  credentialRefs: z.record(z.string().uuid()).optional(),
});

export const flowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  sourceHandle: z.string().optional(),
  target: z.string().min(1),
  targetHandle: z.string().optional(),
});

export const flowDefinitionSchema = z.object({
  schemaVersion: z.literal(1),
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
  viewport: z
    .object({
      x: z.number(),
      y: z.number(),
      zoom: z.number(),
    })
    .optional(),
});

export type FlowNode = z.infer<typeof flowNodeSchema>;
export type FlowEdge = z.infer<typeof flowEdgeSchema>;
export type FlowDefinition = z.infer<typeof flowDefinitionSchema>;

export const workflowStatusSchema = z.enum(["DRAFT", "ACTIVE", "INACTIVE"]);
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;

export const executionStatusSchema = z.enum([
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);
export type ExecutionStatus = z.infer<typeof executionStatusSchema>;

export const nodeExecutionStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "SKIPPED",
]);
export type NodeExecutionStatus = z.infer<typeof nodeExecutionStatusSchema>;

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const NODE_TYPES = {
  MANUAL_TRIGGER: "trigger.manual",
  WEBHOOK_TRIGGER: "trigger.webhook",
  HTTP_REQUEST: "core.httpRequest",
  IF: "core.if",
  SET: "core.set",
  DELAY: "core.delay",
  LOG: "core.log",
  SLACK_SEND: "slack.sendMessage",
  DISCORD_SEND: "discord.sendMessage",
  AIRTABLE_CREATE: "airtable.createRecord",
} as const;
