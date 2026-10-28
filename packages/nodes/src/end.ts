import { NODE_TYPES } from "@flowforge/shared";
import type { NodeDefinition } from "./types.js";

export const endNode: NodeDefinition = {
  type: NODE_TYPES.END,
  version: 1,
  displayName: "End",
  category: "core",
  description: "Marks where the workflow terminates",
  async execute(ctx) {
    return {
      output: ctx.input ?? { done: true },
      logs: [{ level: "info", message: "Workflow reached End", at: ctx.now().toISOString() }],
    };
  },
};
