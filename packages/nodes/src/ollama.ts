import { NODE_TYPES } from "@flowforge/shared";
import { asString, interpolate } from "./interpolate.js";
import type { NodeDefinition } from "./types.js";

function mockCaptions(topic: string) {
  return {
    facebook: `Excited to share thoughts on ${topic} — what's your take?`,
    instagram: `${topic} ✨ Save this for later and tag a friend who needs it.`,
    linkedin: `A quick take on ${topic}: teams that automate the boring parts ship faster.`,
    text: `Captions generated for ${topic}`,
  };
}

function parseCaptions(text: string, topic: string) {
  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const parsed = JSON.parse(text.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
      return {
        facebook: asString(parsed.facebook, asString(parsed.Facebook, text)),
        instagram: asString(parsed.instagram, asString(parsed.Instagram, text)),
        linkedin: asString(parsed.linkedin, asString(parsed.LinkedIn, text)),
        text,
      };
    }
  } catch {
    // fall through
  }
  const mock = mockCaptions(topic);
  return { ...mock, text };
}

export const ollamaNode: NodeDefinition = {
  type: NODE_TYPES.AI_OLLAMA,
  version: 1,
  displayName: "Ollama (Local AI)",
  category: "ai",
  description: "Generate text with a local Ollama model (falls back to mock)",
  async execute(ctx) {
    const interp = {
      input: ctx.input,
      trigger: ctx.trigger,
      steps: ctx.steps,
      now: ctx.now().toISOString(),
    };
    const endpoint = asString(ctx.config.endpoint, "http://localhost:11434").replace(/\/$/, "");
    const model = asString(ctx.config.model, "llama3.1");
    const prompt = interpolate(asString(ctx.config.prompt), interp);
    const topic =
      asString((ctx.steps.topics as { topic?: string } | undefined)?.topic) ||
      asString((ctx.input as { topic?: string } | undefined)?.topic) ||
      "your topic";

    try {
      const response = await fetch(`${endpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, stream: false }),
        signal: ctx.signal,
      });
      if (!response.ok) {
        throw new Error(`Ollama HTTP ${response.status}`);
      }
      const body = (await response.json()) as { response?: string };
      const text = asString(body.response).trim();
      if (!text) throw new Error("Ollama returned an empty response");
      const captions = parseCaptions(text, topic);
      return {
        output: { ...captions, model, endpoint, prompt },
        logs: [
          {
            level: "info",
            message: `Ollama (${model}) returned ${text.length} characters`,
            at: ctx.now().toISOString(),
          },
        ],
      };
    } catch (err) {
      const captions = mockCaptions(topic);
      const reason = err instanceof Error ? err.message : String(err);
      return {
        output: { ...captions, model, endpoint, prompt, mocked: true },
        logs: [
          {
            level: "warn",
            message: `Ollama unavailable (${reason}); using mock captions`,
            at: ctx.now().toISOString(),
          },
        ],
      };
    }
  },
};
