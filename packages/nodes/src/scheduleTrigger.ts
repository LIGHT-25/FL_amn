import { NODE_TYPES } from "@flowforge/shared";
import { asString } from "./interpolate.js";
import type { NodeDefinition } from "./types.js";

/** On Test run, schedule fires once like a manual tick. Hosted runs use the same node. */
export const scheduleTriggerNode: NodeDefinition = {
  type: NODE_TYPES.SCHEDULE_TRIGGER,
  version: 1,
  displayName: "Schedule",
  category: "trigger",
  description: "Run on a cron schedule (fires once when testing manually)",
  async execute(ctx) {
    const cron = asString(ctx.config.cron, "0 9 * * *");
    const timezone = asString(ctx.config.timezone, "UTC");
    const activeFrom = asString(ctx.config.activeFrom).trim() || undefined;
    const activeUntil = asString(ctx.config.activeUntil).trim() || undefined;
    const firedAt = ctx.now().toISOString();
    return {
      output: {
        cron,
        timezone,
        activeFrom,
        activeUntil,
        firedAt,
        source: "schedule",
        ...(typeof ctx.trigger === "object" && ctx.trigger ? ctx.trigger : {}),
      },
      logs: [
        {
          level: "info",
          message: `Schedule trigger fired (${cron}, ${timezone}${
            activeFrom || activeUntil ? `; window ${activeFrom ?? "…"} → ${activeUntil ?? "…"}` : ""
          })`,
          at: firedAt,
        },
      ],
    };
  },
};
