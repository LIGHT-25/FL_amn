import { NODE_TYPES } from "@flowforge/shared";

export type NodePaletteItem = {
  type: string;
  version: number;
  displayName: string;
  category: "trigger" | "core" | "connector";
  description: string;
};

/** MVP palette metadata — runtime execute() implementations land in Weeks 7–13. */
export const MVP_NODE_PALETTE: NodePaletteItem[] = [
  {
    type: NODE_TYPES.MANUAL_TRIGGER,
    version: 1,
    displayName: "Manual Trigger",
    category: "trigger",
    description: "Start a workflow from the UI or API",
  },
  {
    type: NODE_TYPES.WEBHOOK_TRIGGER,
    version: 1,
    displayName: "Webhook Trigger",
    category: "trigger",
    description: "Start a workflow from an HTTP webhook",
  },
  {
    type: NODE_TYPES.HTTP_REQUEST,
    version: 1,
    displayName: "HTTP Request",
    category: "core",
    description: "Call an external HTTP API",
  },
  {
    type: NODE_TYPES.IF,
    version: 1,
    displayName: "IF / Else",
    category: "core",
    description: "Branch on a condition",
  },
  {
    type: NODE_TYPES.SET,
    version: 1,
    displayName: "Set / Transform",
    category: "core",
    description: "Map and transform JSON fields",
  },
  {
    type: NODE_TYPES.DELAY,
    version: 1,
    displayName: "Delay",
    category: "core",
    description: "Wait up to 60 seconds",
  },
  {
    type: NODE_TYPES.LOG,
    version: 1,
    displayName: "Log / Debug",
    category: "core",
    description: "Write a value to execution logs",
  },
  {
    type: NODE_TYPES.SLACK_SEND,
    version: 1,
    displayName: "Slack Message",
    category: "connector",
    description: "Post via Slack incoming webhook",
  },
  {
    type: NODE_TYPES.DISCORD_SEND,
    version: 1,
    displayName: "Discord Message",
    category: "connector",
    description: "Post via Discord webhook",
  },
  {
    type: NODE_TYPES.AIRTABLE_CREATE,
    version: 1,
    displayName: "Airtable Create Record",
    category: "connector",
    description: "Create a row in Airtable",
  },
];

export function listNodeTypes(): NodePaletteItem[] {
  return MVP_NODE_PALETTE;
}
