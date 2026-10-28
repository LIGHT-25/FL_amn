import { NODE_TYPES } from "@flowforge/shared";
import type { NodeDefinition } from "./types.js";

export const manualTriggerNode: NodeDefinition = {
  type: NODE_TYPES.MANUAL_TRIGGER,
  version: 1,
  displayName: "Manual Trigger",
  category: "trigger",
  description: "Start a workflow from the UI or API",
  async execute(ctx) {
    return {
      output: ctx.trigger ?? { startedAt: ctx.now().toISOString() },
      logs: [{ level: "info", message: "Manual run started", at: ctx.now().toISOString() }],
    };
  },
};
