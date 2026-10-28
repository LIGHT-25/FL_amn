import { NODE_TYPES } from "@flowforge/shared";
import { asString, interpolate } from "./interpolate.js";
import { connectorStrict, publishEnabled, requireSecret, resolveSecret } from "./strict.js";
import type { NodeDefinition } from "./types.js";

export const slackMessageNode: NodeDefinition = {
  type: NODE_TYPES.SLACK_MESSAGE,
  version: 1,
  displayName: "Slack: Send Message",
  category: "connector",
  description: "Post to Slack via incoming webhook",
  async execute(ctx) {
    if (!publishEnabled(ctx.env)) {
      const channel = asString(ctx.config.channel, "#general");
      const text = interpolate(asString(ctx.config.text), {
        input: ctx.input,
        trigger: ctx.trigger,
        steps: ctx.steps,
        now: ctx.now().toISOString(),
      });
      return {
        output: { channel, text, ok: true, mocked: true, skippedPublish: true },
        logs: [
          {
            level: "warn",
            message: `Slack publish skipped on the public demo (DEMO_PUBLISH_ENABLED=false). Would have posted to ${channel}.`,
            at: ctx.now().toISOString(),
          },
        ],
      };
    }
    const interp = {
      input: ctx.input,
      trigger: ctx.trigger,
      steps: ctx.steps,
      now: ctx.now().toISOString(),
    };
    const channel = asString(ctx.config.channel, "#general");
    const text = interpolate(asString(ctx.config.text), interp);
    const webhook = requireSecret({
      label: "Slack webhook URL",
      value: resolveSecret(undefined, ctx.env.SLACK_WEBHOOK_URL, [""], ctx.env),
      env: ctx.env,
      hint: "Set SLACK_WEBHOOK_URL in .env",
    });

    if (webhook) {
      const response = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, text }),
        signal: ctx.signal,
      });
      if (!response.ok) {
        throw new Error(`Slack webhook HTTP ${response.status}`);
      }
      return {
        output: { channel, text, ok: true, mocked: false },
        logs: [
          {
            level: "info",
            message: `Slack message sent to ${channel}`,
            at: ctx.now().toISOString(),
          },
        ],
      };
    }

    if (connectorStrict(ctx.env)) {
      throw new Error("Slack webhook URL is required. Set SLACK_WEBHOOK_URL in .env");
    }

    return {
      output: { channel, text, ok: true, mocked: true },
      logs: [
        {
          level: "warn",
          message: `Slack mocked → ${channel}: ${text.slice(0, 120)}`,
          at: ctx.now().toISOString(),
        },
      ],
    };
  },
};
