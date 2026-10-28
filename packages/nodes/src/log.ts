import { NODE_TYPES } from "@flowforge/shared";
import type { NodeDefinition } from "./types.js";

export const logNode: NodeDefinition = {
  type: NODE_TYPES.LOG,
  version: 1,
  displayName: "Log / Debug",
  category: "core",
  description: "Write a value to execution logs",
  async execute(ctx) {
    const message =
      typeof ctx.config.message === "string" && ctx.config.message.trim()
        ? ctx.config.message
        : "Logged previous step output";
    const payload = JSON.stringify(ctx.input, null, 2);
    return {
      output: ctx.input,
      logs: [
        {
          level: "info",
          message: `${message}\n${payload}`,
          at: ctx.now().toISOString(),
        },
      ],
    };
  },
};
