import { NODE_TYPES } from "@flowforge/shared";
import { endNode } from "./end.js";
import { facebookPostNode } from "./facebook.js";
import { geminiNode } from "./gemini.js";
import { ifNode } from "./ifNode.js";
import { imagesSearchNode } from "./images.js";
import { logNode } from "./log.js";
import { manualTriggerNode } from "./manualTrigger.js";
import { ollamaNode } from "./ollama.js";
import { scheduleTriggerNode } from "./scheduleTrigger.js";
import { sheetsAppendNode, sheetsReadNode } from "./sheets.js";
import { slackMessageNode } from "./slack.js";
import { tavilySearchNode } from "./tavily.js";
import type { NodeDefinition } from "./types.js";

export type { NodeDefinition, NodeExecutionContext, NodeExecutionResult, SafeLogEntry } from "./types.js";
export { deepInterpolate, interpolate, interpolateJsonTemplate, slugStepKey } from "./interpolate.js";
export { connectorStrict, demoMode, publishEnabled, resolveSecret, requireSecret, sheetsMock } from "./strict.js";
export {
  looksLikeGoogleSpreadsheetId,
  loadGoogleServiceAccount,
  gridToObjects,
  googleReadRows,
  googleEnsureHeaderAndAppend,
  googleListSheetTitles,
  googleEnsureSheetTab,
} from "./googleSheets.js";

export type NodePaletteItem = {
  type: string;
  version: number;
  displayName: string;
  category: "trigger" | "core" | "connector" | "ai";
  description: string;
  executable: boolean;
};

const EXECUTABLE: NodeDefinition[] = [
  manualTriggerNode,
  scheduleTriggerNode,
  endNode,
  logNode,
  ifNode,
  geminiNode,
  ollamaNode,
  sheetsReadNode,
  sheetsAppendNode,
  tavilySearchNode,
  imagesSearchNode,
  facebookPostNode,
  slackMessageNode,
];

const PLACEHOLDER: NodePaletteItem[] = [
  {
    type: NODE_TYPES.WEBHOOK_TRIGGER,
    version: 1,
    displayName: "Webhook",
    category: "trigger",
    description: "Start a workflow from an HTTP webhook",
    executable: false,
  },
  {
    type: NODE_TYPES.HTTP_REQUEST,
    version: 1,
    displayName: "HTTP Request",
    category: "core",
    description: "Call an external HTTP API",
    executable: false,
  },
  {
    type: NODE_TYPES.SET,
    version: 1,
    displayName: "Set / Transform",
    category: "core",
    description: "Map and transform JSON fields",
    executable: false,
  },
  {
    type: NODE_TYPES.DELAY,
    version: 1,
    displayName: "Delay",
    category: "core",
    description: "Wait up to 60 seconds",
    executable: false,
  },
  {
    type: NODE_TYPES.DISCORD_SEND,
    version: 1,
    displayName: "Discord Message",
    category: "connector",
    description: "Post via Discord webhook",
    executable: false,
  },
  {
    type: NODE_TYPES.AIRTABLE_CREATE,
    version: 1,
    displayName: "Airtable Create Record",
    category: "connector",
    description: "Create a row in Airtable",
    executable: false,
  },
];

const byType = new Map<string, NodeDefinition>(EXECUTABLE.map((n) => [n.type, n]));

/** MVP palette — executable nodes first, then stubs still shown in /node-types. */
export const MVP_NODE_PALETTE: NodePaletteItem[] = [
  ...EXECUTABLE.map((n) => ({
    type: n.type,
    version: n.version,
    displayName: n.displayName,
    category: n.category,
    description: n.description,
    executable: true,
  })),
  ...PLACEHOLDER,
];

export function listNodeTypes(): NodePaletteItem[] {
  return MVP_NODE_PALETTE;
}

export function getNodeDefinition(type: string): NodeDefinition | undefined {
  return byType.get(type);
}
