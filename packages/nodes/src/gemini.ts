import { NODE_TYPES } from "@flowforge/shared";
import { asString, interpolate } from "./interpolate.js";
import type { NodeDefinition } from "./types.js";

const DEFAULT_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemma-4-26b-a4b-it",
] as const;

function combineSignals(parent: AbortSignal, timeoutMs: number): AbortSignal {
  if (typeof AbortSignal.any === "function" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.any([parent, AbortSignal.timeout(timeoutMs)]);
  }
  return parent;
}

function parseCaptions(text: string): {
  facebook: string;
  instagram: string;
  linkedin: string;
  text: string;
} {
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
    // fall through — use full text for each channel
  }
  return { facebook: text, instagram: text, linkedin: text, text };
}

async function callGeminiOnce(params: {
  apiKey: string;
  model: string;
  prompt: string;
  signal: AbortSignal;
}): Promise<string> {
  const uri = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(params.model)}:generateContent`;
  const response = await fetch(uri, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": params.apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: params.prompt }] }],
    }),
    signal: params.signal,
  });

  const raw = await response.text();
  let body: unknown = undefined;
  try {
    body = raw ? JSON.parse(raw) : undefined;
  } catch {
    body = raw;
  }

  if (!response.ok) {
    const message =
      (body as { error?: { message?: string } })?.error?.message ??
      `Gemini HTTP ${response.status}`;
    throw new Error(message);
  }

  const candidates = (body as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
    ?.candidates;
  const text = candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) {
    throw new Error("Gemini returned an empty response");
  }
  return text;
}

async function callGemini(params: {
  apiKey: string;
  models: string[];
  prompt: string;
  signal: AbortSignal;
}): Promise<{ text: string; model: string }> {
  const errors: string[] = [];

  for (const model of params.models) {
    try {
      const text = await callGeminiOnce({
        apiKey: params.apiKey,
        model,
        prompt: params.prompt,
        signal: combineSignals(params.signal, 30_000),
      });
      return { text, model };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${model}: ${message}`);
      if (params.signal.aborted) throw err;
    }
  }

  throw new Error(`All Gemini models failed. ${errors.join(" | ")}`);
}

export const geminiNode: NodeDefinition = {
  type: NODE_TYPES.AI_GEMINI,
  version: 1,
  displayName: "Google Gemini",
  category: "ai",
  description: "Generate text with Google Gemini",
  async execute(ctx) {
    const apiKey = ctx.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set on the API server");
    }

    const promptTemplate = asString(ctx.config.prompt).trim();
    if (!promptTemplate) {
      throw new Error("Gemini prompt is required");
    }

    const preferred =
      asString(ctx.config.model).trim() ||
      ctx.env.GEMINI_MODEL?.trim() ||
      DEFAULT_MODELS[0];

    const models = [preferred, ...DEFAULT_MODELS.filter((m) => m !== preferred)];
    const prompt = interpolate(promptTemplate, {
      input: ctx.input,
      trigger: ctx.trigger,
      steps: ctx.steps,
      now: ctx.now().toISOString(),
    });
    const { text, model } = await callGemini({
      apiKey,
      models,
      prompt,
      signal: ctx.signal,
    });
    const captions = parseCaptions(text);

    return {
      output: { ...captions, model, prompt },
      logs: [
        {
          level: "info",
          message: `Gemini (${model}) returned ${text.length} characters`,
          at: ctx.now().toISOString(),
        },
      ],
    };
  },
};
