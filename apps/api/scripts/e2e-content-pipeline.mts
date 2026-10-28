/**
 * Live Content Pipeline run against Google Sheets + Facebook + Unsplash + Gemini + Tavily.
 * Usage (from apps/api): pnpm exec tsx --env-file=../../.env scripts/e2e-content-pipeline.mts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { executeFlow } from "@flowforge/engine";
import type { FlowDefinition } from "@flowforge/shared";

const workflowPath = resolve(process.cwd(), "../../workflow-debug.json");
const raw = readFileSync(workflowPath, "utf8").replace(/^\uFEFF/, "");
const saved = JSON.parse(raw) as {
  graph?: FlowDefinition;
};

const flow = saved.graph;
if (!flow?.nodes?.length) {
  console.error("No graph in workflow-debug.json — fetch the workflow first.");
  process.exit(1);
}

// Ensure Sheets steps use the Google spreadsheet from env (blank → env ID).
for (const node of flow.nodes) {
  if (node.type.startsWith("app.sheets.")) {
    node.config = { ...node.config, spreadsheetId: "" };
  }
}

console.log("Running Content Pipeline with live connectors…");
console.log(
  "GOOGLE_SHEETS_SPREADSHEET_ID=",
  process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
);
console.log("sa file=", process.env.GOOGLE_SERVICE_ACCOUNT_FILE);

const result = await executeFlow(flow, {
  trigger: { source: "e2e", startedAt: new Date().toISOString() },
  env: process.env,
});

console.log("\n=== RUN", result.status, `(${result.durationMs}ms) ===`);
if (result.errorMessage) console.log("error:", result.errorMessage);

for (const node of result.nodes) {
  const mark =
    node.status === "SUCCEEDED" ? "OK" : node.status === "SKIPPED" ? "--" : "XX";
  const log = node.logs?.map((l) => l.message).join(" | ") || node.errorMessage || "";
  console.log(`[${mark}] ${node.name} (${node.nodeType}) ${log.slice(0, 180)}`);
}

const draft = result.nodes.find((n) => n.name === "Save draft");
const publish = result.nodes.find((n) => n.name === "Publish post");
const sheetsBackend = (draft?.output as { backend?: string } | undefined)?.backend;
const fbId = (publish?.output as { id?: string; mocked?: boolean } | undefined)?.id;
const fbMock = (publish?.output as { mocked?: boolean } | undefined)?.mocked;

console.log("\n=== PROOF ===");
console.log("Sheets backend:", sheetsBackend);
console.log(
  "Sheet URL: https://docs.google.com/spreadsheets/d/" +
    (process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "") +
    "/edit",
);
console.log("Facebook post id:", fbId, "mocked:", fbMock);

if (result.status !== "SUCCEEDED") process.exit(1);
if (sheetsBackend !== "google") {
  console.error("Expected Google Sheets backend, got", sheetsBackend);
  process.exit(1);
}
if (!fbId || fbMock) {
  console.error("Expected a real Facebook publish");
  process.exit(1);
}
console.log("\nLIVE E2E PASSED");
