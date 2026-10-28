import { asString } from "./interpolate.js";

/** When true (default), connectors must use real credentials — no silent mock success. */
export function connectorStrict(env: Record<string, string | undefined>): boolean {
  return (env.CONNECTOR_STRICT ?? "true").toLowerCase() !== "false";
}

export function sheetsMock(env: Record<string, string | undefined>): boolean {
  return (env.SHEETS_MOCK ?? "false").toLowerCase() === "true";
}

const DEFAULT_SENTINELS = ["", "tavily-key", "pixabay-key", "unsplash-key", "pexels-key", "meta-token", "gemini-key"];

/** Pick first non-sentinel credential from config or env. */
export function resolveSecret(
  configValue: unknown,
  envValue: string | undefined,
  sentinels: string[] = DEFAULT_SENTINELS,
): string {
  const fromConfig = asString(configValue).trim();
  const fromEnv = (envValue ?? "").trim();
  for (const candidate of [fromConfig, fromEnv]) {
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
