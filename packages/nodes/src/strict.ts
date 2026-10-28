import { asString } from "./interpolate.js";

/** When true (default), connectors must use real credentials — no silent mock success. */
export function connectorStrict(env: Record<string, string | undefined>): boolean {
  return (env.CONNECTOR_STRICT ?? "true").toLowerCase() !== "false";
}

export function sheetsMock(env: Record<string, string | undefined>): boolean {
  return (env.SHEETS_MOCK ?? "false").toLowerCase() === "true";
}

/** Shared hosted demo: ignore pasted node secrets; always use process.env. */
export function demoMode(env: Record<string, string | undefined>): boolean {
  return (env.DEMO_MODE ?? "false").toLowerCase() === "true";
}

/** Facebook/Slack publish — off by default when DEMO_MODE is on. */
export function publishEnabled(env: Record<string, string | undefined>): boolean {
  const demo = demoMode(env);
  return (env.DEMO_PUBLISH_ENABLED ?? (demo ? "false" : "true")).toLowerCase() === "true";
}

const DEFAULT_SENTINELS = ["", "tavily-key", "pixabay-key", "unsplash-key", "pexels-key", "meta-token", "gemini-key"];

/** Pick first non-sentinel credential from config or env. */
export function resolveSecret(
  configValue: unknown,
  envValue: string | undefined,
  sentinels: string[] = DEFAULT_SENTINELS,
  env?: Record<string, string | undefined>,
): string {
  const fromConfig = asString(configValue).trim();
  const fromEnv = (envValue ?? "").trim();
  const candidates =
    env && demoMode(env) ? [fromEnv] : [fromConfig, fromEnv];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (sentinels.includes(candidate)) continue;
    return candidate;
  }
  return "";
}

export function requireSecret(params: {
  label: string;
  value: string;
  env: Record<string, string | undefined>;
  hint: string;
}): string {
  if (params.value) return params.value;
  if (connectorStrict(params.env)) {
    throw new Error(`${params.label} is required. ${params.hint}`);
  }
  return "";
}
