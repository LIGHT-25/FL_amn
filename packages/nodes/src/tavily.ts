import { NODE_TYPES } from "@flowforge/shared";
import { asNumber, asString, interpolate } from "./interpolate.js";
import { connectorStrict, requireSecret, resolveSecret } from "./strict.js";
import type { NodeDefinition } from "./types.js";

export const tavilySearchNode: NodeDefinition = {
  type: NODE_TYPES.TAVILY_SEARCH,
  version: 1,
  displayName: "Tavily Web Search",
  category: "connector",
  description: "Search the web via Tavily API",
  async execute(ctx) {
    const interp = {
      input: ctx.input,
      trigger: ctx.trigger,
      steps: ctx.steps,
      now: ctx.now().toISOString(),
    };
    const query = interpolate(asString(ctx.config.query, asString((ctx.input as { topic?: string })?.topic)), interp);
    const maxResults = asNumber(ctx.config.maxResults, 5);
    const apiKey = requireSecret({
      label: "Tavily API key",
      value: resolveSecret(ctx.config.credential, ctx.env.TAVILY_API_KEY, ["", "tavily-key"], ctx.env),
      env: ctx.env,
      hint: "Set TAVILY_API_KEY in .env",
    });

    if (apiKey) {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          max_results: maxResults,
          include_answer: true,
        }),
        signal: ctx.signal,
      });
      const body = (await response.json()) as {
        answer?: string;
        results?: Array<{ title?: string; url?: string; content?: string }>;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(body.error ?? `Tavily HTTP ${response.status}`);
      }
      return {
        output: {
          query,
          answer: body.answer ?? "",
          results: body.results ?? [],
          mocked: false,
        },
        logs: [
          {
            level: "info",
            message: `Tavily returned ${(body.results ?? []).length} results for "${query}"`,
            at: ctx.now().toISOString(),
          },
        ],
      };
    }

    if (connectorStrict(ctx.env)) {
      throw new Error("Tavily API key is required. Set TAVILY_API_KEY in .env");
    }

    const results = [
      {
        title: `Overview: ${query || "topic"}`,
        url: "https://example.com/research/1",
        content: `Key talking points and recent developments related to ${query || "the topic"}.`,
      },
      {
        title: `Audience angles for ${query || "topic"}`,
        url: "https://example.com/research/2",
        content: "Practical tips, stats, and hooks suitable for social captions.",
      },
    ].slice(0, maxResults);

    return {
      output: {
        query,
        answer: `Mock research brief for: ${query}`,
        results,
        mocked: true,
      },
      logs: [
        {
          level: "warn",
          message: `Tavily mocked (${results.length} results). Set TAVILY_API_KEY for live search.`,
          at: ctx.now().toISOString(),
        },
      ],
    };
  },
};
