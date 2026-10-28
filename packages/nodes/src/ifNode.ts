import { NODE_TYPES } from "@flowforge/shared";
import { asString, interpolate } from "./interpolate.js";
import type { NodeDefinition } from "./types.js";

function isEmpty(value: string): boolean {
  if (!value.trim()) return true;
  if (value === "[]" || value === "{}") return true;
  return false;
}

function compare(left: string, operator: string, right: string): boolean {
  switch (operator) {
    case "equals":
      return left === right;
    case "not equals":
      return left !== right;
    case "contains":
      return left.includes(right);
    case "greater than":
      return Number(left) > Number(right);
    case "less than":
      return Number(left) < Number(right);
    case "is empty":
      return isEmpty(left);
    default:
      return left === right;
  }
}

export const ifNode: NodeDefinition = {
  type: NODE_TYPES.IF,
  version: 1,
  displayName: "IF / Else",
  category: "core",
  description: "Branch on a condition",
  async execute(ctx) {
    const interp = {
      input: ctx.input,
      trigger: ctx.trigger,
      steps: ctx.steps,
      now: ctx.now().toISOString(),
    };
    const left = interpolate(asString(ctx.config.left), interp);
    const right = interpolate(asString(ctx.config.right), interp);
    const operator = asString(ctx.config.operator, "equals");
    const passed = compare(left, operator, right);
    const branch = passed ? "true" : "false";

    return {
      output: { left, right, operator, result: passed, branch },
      branch,
      logs: [
        {
          level: "info",
          message: `IF ${JSON.stringify(left)} ${operator} ${JSON.stringify(right)} → ${branch}`,
          at: ctx.now().toISOString(),
        },
      ],
    };
  },
};
