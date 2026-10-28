import { afterEach, describe, expect, it, vi } from "vitest";
import type { FlowDefinition } from "@flowforge/shared";
import { executeFlow } from "./execute.js";

/** Mirrors the Explore Content Pipeline graph (ids simplified). */
function contentPipelineFlow(): FlowDefinition {
  return {
    schemaVersion: 1,
    nodes: [
      { id: "n0", type: "trigger.schedule", typeVersion: 1, name: "Daily topics", position: { x: 0, y: 0 }, config: { stepKey: "schedule", cron: "0 9 * * *", timezone: "Asia/Kolkata" } },
      { id: "n1", type: "app.sheets.read", typeVersion: 1, name: "Fetch topics", position: { x: 0, y: 180 }, config: { stepKey: "topics", spreadsheetId: "content-calendar", sheet: "Topics", range: "A1:F100" } },
      { id: "n2", type: "app.tavily.search", typeVersion: 1, name: "Research topic", position: { x: 0, y: 360 }, config: { stepKey: "research", query: "{{ steps.topics.topic }}", maxResults: 5 } },
      {
        id: "n3",
        type: "ai.gemini",
        typeVersion: 1,
        name: "Write captions",
        position: { x: 0, y: 540 },
        config: {
          stepKey: "captions",
          model: "gemini-flash-lite-latest",
          prompt: 'JSON captions {"facebook","instagram","linkedin"} for {{ steps.topics.topic }}',
        },
      },
      { id: "n4", type: "app.images.search", typeVersion: 1, name: "Find images", position: { x: 0, y: 720 }, config: { stepKey: "images", provider: "Unsplash", query: "{{ steps.topics.keywords }}" } },
      { id: "n5", type: "app.sheets.append", typeVersion: 1, name: "Save draft", position: { x: 0, y: 900 }, config: { stepKey: "draft", spreadsheetId: "content-calendar", sheet: "Drafts", values: '{ "Topic": "{{ steps.topics.topic }}", "Keywords": "{{ steps.topics.keywords }}", "Caption": "{{ steps.captions.facebook }}", "ImageUrl": "{{ steps.images.url }}", "Status": "approved" }' } },
      { id: "n6", type: "logic.if", typeVersion: 1, name: "Approved?", position: { x: 0, y: 1080 }, config: { stepKey: "approval", left: "{{ steps.draft.status }}", operator: "equals", right: "approved" } },
      { id: "n7", type: "app.facebook.post", typeVersion: 1, name: "Publish post", position: { x: -340, y: 1260 }, config: { stepKey: "publish", pageId: "", message: "{{ steps.captions.facebook }}", imageUrl: "{{ steps.images.url }}" } },
      { id: "n8", type: "app.sheets.append", typeVersion: 1, name: "Mark published", position: { x: -340, y: 1440 }, config: { stepKey: "published", spreadsheetId: "content-calendar", sheet: "Drafts", values: '{ "Status": "Published", "Topic": "{{ steps.topics.topic }}", "ImageUrl": "{{ steps.images.url }}" }' } },
      { id: "n9", type: "app.slack.message", typeVersion: 1, name: "Revision needed", position: { x: 340, y: 1260 }, config: { stepKey: "revision", channel: "#content", text: "Draft needs revision: {{ steps.topics.topic }}" } },
      { id: "end", type: "core.end", typeVersion: 1, name: "End", position: { x: 0, y: 1620 }, config: {} },
    ],
    edges: [
      { id: "e0", source: "n0", target: "n1" },
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n3" },
      { id: "e3", source: "n3", target: "n4" },
      { id: "e4", source: "n4", target: "n5" },
      { id: "e5", source: "n5", target: "n6" },
      { id: "e6", source: "n6", target: "n7", sourceHandle: "true" },
      { id: "e7", source: "n7", target: "n8" },
      { id: "e8", source: "n6", target: "n9", sourceHandle: "false" },
      { id: "e9", source: "n8", target: "end" },
      { id: "e10", source: "n9", target: "end" },
    ],
  };
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function stubGeminiFetch() {
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("generativelanguage.googleapis.com")) {
      const captions = {
        facebook: "FB caption",
        instagram: "IG caption",
        linkedin: "LI caption",
      };
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(captions) }] } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return originalFetch(input, init);
  }) as typeof fetch;
}

describe("Content Pipeline smoke", () => {
  it("runs the publish branch with mocks", async () => {
    stubGeminiFetch();
    const result = await executeFlow(contentPipelineFlow(), {
      trigger: { source: "test" },
      env: {
        SHEETS_MOCK: "true",
        CONNECTOR_STRICT: "false",
        GEMINI_API_KEY: "test-key",
      },
    });

    expect(result.status).toBe("SUCCEEDED");
    const byName = Object.fromEntries(result.nodes.map((n) => [n.name, n]));
    expect(byName["Write captions"]?.status).toBe("SUCCEEDED");
    expect(byName["Publish post"]?.status).toBe("SUCCEEDED");
    expect(byName["Mark published"]?.status).toBe("SUCCEEDED");
    expect(byName["Revision needed"]?.status).toBe("SKIPPED");
    expect(byName.End?.status).toBe("SUCCEEDED");
  }, 30_000);

  it("runs the revision branch when draft is not approved", async () => {
    stubGeminiFetch();
    const flow = contentPipelineFlow();
    const draft = flow.nodes.find((n) => n.id === "n5")!;
    draft.config = {
      ...draft.config,
      values:
        '{ "Topic": "{{ steps.topics.topic }}", "Keywords": "{{ steps.topics.keywords }}", "Caption": "{{ steps.captions.facebook }}", "ImageUrl": "{{ steps.images.url }}", "Status": "Review" }',
    };

    const result = await executeFlow(flow, {
      trigger: { source: "test" },
      env: {
        SHEETS_MOCK: "true",
        CONNECTOR_STRICT: "false",
        GEMINI_API_KEY: "test-key",
      },
    });

    expect(result.status).toBe("SUCCEEDED");
    const byName = Object.fromEntries(result.nodes.map((n) => [n.name, n]));
    expect(byName["Revision needed"]?.status).toBe("SUCCEEDED");
    expect(byName["Publish post"]?.status).toBe("SKIPPED");
    expect(byName.End?.status).toBe("SUCCEEDED");
  }, 30_000);
});
