/** Resolve `{{ path.to.value }}` against a context object. */

function getPath(root: unknown, path: string): unknown {
  if (!path) return root;
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = root;
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function stringify(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export type InterpolateContext = {
  input?: unknown;
  trigger?: unknown;
  steps?: Record<string, unknown>;
  now?: string;
};

function resolveExpr(expr: string, ctx: InterpolateContext): unknown {
  if (expr === "now") return ctx.now ?? new Date().toISOString();
  if (expr === "input") return ctx.input;
  if (expr === "trigger") return ctx.trigger;
  if (expr.startsWith("input.")) return getPath(ctx.input, expr.slice("input.".length));
  if (expr.startsWith("trigger.")) return getPath(ctx.trigger, expr.slice("trigger.".length));
  if (expr.startsWith("steps.")) return getPath(ctx.steps ?? {}, expr.slice("steps.".length));
  const fromSteps = getPath(ctx.steps ?? {}, expr);
  if (fromSteps !== undefined) return fromSteps;
  return getPath(ctx.input, expr);
}

/**
 * Replace `{{ … }}` tokens. Supports:
 * - `{{input}}` / `{{input.field}}`
 * - `{{trigger}}` / `{{trigger.field}}`
 * - `{{steps.<key>.field}}`
 * - `{{now}}`
 */
export function interpolate(template: string, ctx: InterpolateContext): string {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, raw: string) => stringify(resolveExpr(raw.trim(), ctx)));
}

function looksLikeJsonDocument(value: string): boolean {
  const trimmed = value.trim();
  return (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  );
}

/** Escape raw control characters that appear inside JSON "string literals". */
export function escapeControlCharsInsideJsonStrings(src: string): string {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (inString) {
      if (escaped) {
        out += c;
        escaped = false;
        continue;
      }
      if (c === "\\") {
        out += c;
        escaped = true;
        continue;
      }
      if (c === '"') {
        inString = false;
        out += c;
        continue;
      }
      const code = c.charCodeAt(0);
      if (code <= 0x1f) {
        if (c === "\n") out += "\\n";
        else if (c === "\r") out += "\\r";
        else if (c === "\t") out += "\\t";
        else out += `\\u${code.toString(16).padStart(4, "0")}`;
        continue;
      }
      out += c;
    } else {
      if (c === '"') inString = true;
      out += c;
    }
  }
  return out;
}

/**
 * Interpolate a JSON template without embedding caption text into the JSON source.
 * Placeholders become safe tokens, the skeleton is parsed, then real values are revived.
 */
export function interpolateJsonTemplate(template: string, ctx: InterpolateContext): unknown {
  const bag: unknown[] = [];

  const push = (raw: string): string => {
    const i = bag.length;
    bag.push(resolveExpr(raw.trim(), ctx) ?? "");
    return `"<<FF${i}>>"`;
  };

  let tokenized = template.replace(/"\{\{\s*([^}]+?)\s*\}\}"/g, (_, raw: string) => push(raw));
  tokenized = tokenized.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, raw: string) => push(raw));

  let parsed: unknown;
  try {
    parsed = JSON.parse(tokenized);
  } catch (err) {
    try {
      parsed = JSON.parse(escapeControlCharsInsideJsonStrings(tokenized));
    } catch {
      throw new Error(
        `JSON template is invalid after placeholder tokenization: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  return revivePlaceholders(parsed, bag);
}

function revivePlaceholders(node: unknown, bag: unknown[]): unknown {
  if (typeof node === "string") {
    const match = /^<<FF(\d+)>>$/.exec(node);
    if (match) return bag[Number(match[1])] ?? "";
    return node;
  }
  if (Array.isArray(node)) return node.map((item) => revivePlaceholders(item, bag));
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      out[key] = revivePlaceholders(value, bag);
    }
    return out;
  }
  return node;
}

/**
 * Deep-interpolate configs. JSON-looking strings (Sheets values, mappings, …) use
 * JSON-safe substitution so Gemini captions with newlines cannot break parsing.
 * Plain strings still use classic {{ }} replacement.
 */
export function deepInterpolate<T>(value: T, ctx: InterpolateContext): T {
  if (typeof value === "string") {
    if (looksLikeJsonDocument(value)) {
      if (/\{\{/.test(value)) {
        try {
          return interpolateJsonTemplate(value, ctx) as T;
        } catch {
          // fall through to classic interpolate
        }
      } else {
        try {
          return JSON.parse(value) as T;
        } catch {
          try {
            return JSON.parse(escapeControlCharsInsideJsonStrings(value)) as T;
          } catch {
            // fall through
          }
        }
      }
    }
    return interpolate(value, ctx) as T;
  }
  if (Array.isArray(value)) return value.map((v) => deepInterpolate(v, ctx)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepInterpolate(v, ctx);
    }
    return out as T;
  }
  return value;
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  return fallback;
}

export function slugStepKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
