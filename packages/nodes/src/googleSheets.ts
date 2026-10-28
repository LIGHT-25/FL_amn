import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export type GoogleServiceAccount = {
  client_email: string;
  private_key: string;
};

type TokenCache = { accessToken: string; expiresAtMs: number };
let tokenCache: TokenCache | null = null;

/** Google spreadsheet IDs are long URL-safe tokens (not short calendar keys like content-calendar). */
export function looksLikeGoogleSpreadsheetId(id: string): boolean {
  return /^[a-zA-Z0-9-_]{30,}$/.test(id.trim());
}

function parseServiceAccountJson(raw: string, source: string): GoogleServiceAccount {
  try {
    const parsed = JSON.parse(raw) as Partial<GoogleServiceAccount>;
    if (parsed.client_email && parsed.private_key) {
      return {
        client_email: parsed.client_email,
        private_key: normalizePrivateKey(parsed.private_key),
      };
    }
  } catch {
    throw new Error(`${source} is not valid JSON.`);
  }
  throw new Error(`${source} must include client_email and private_key.`);
}

export function loadGoogleServiceAccount(
  env: Record<string, string | undefined>,
): GoogleServiceAccount | null {
  const filePath = env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim();
  if (filePath) {
    const absolute = isAbsolute(filePath) ? filePath : resolve(process.cwd(), filePath);
    // API runs from apps/api — also try monorepo root (../..)
    const candidates = [
      absolute,
      resolve(process.cwd(), "../../", filePath),
      resolve(process.cwd(), "../", filePath),
    ];
    const hit = candidates.find((p) => existsSync(p));
    if (!hit) {
      throw new Error(
        `GOOGLE_SERVICE_ACCOUNT_FILE not found (tried ${candidates.join(", ")}).`,
      );
    }
    return parseServiceAccountJson(readFileSync(hit, "utf8"), hit);
  }

  const rawJson = env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    return parseServiceAccountJson(rawJson, "GOOGLE_SERVICE_ACCOUNT_JSON");
  }

  const email = env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();
  if (email && key) {
    return { client_email: email, private_key: normalizePrivateKey(key) };
  }
  return null;
}

function normalizePrivateKey(key: string): string {
  return key.replace(/\\n/g, "\n").trim();
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

async function fetchAccessToken(account: GoogleServiceAccount, signal: AbortSignal): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.expiresAtMs > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: account.client_email,
      scope: SHEETS_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(account.private_key, "base64url");
  const assertion = `${unsigned}.${signature}`;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    signal,
  });
  const body = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!response.ok || !body.access_token) {
    throw new Error(
      body.error_description ?? body.error ?? `Google token HTTP ${response.status}`,
    );
  }
  tokenCache = {
    accessToken: body.access_token,
    expiresAtMs: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return body.access_token;
}

async function sheetsFetch<T>(params: {
  account: GoogleServiceAccount;
  path: string;
  method?: string;
  query?: Record<string, string>;
  body?: unknown;
  signal: AbortSignal;
}): Promise<T> {
  const token = await fetchAccessToken(params.account, params.signal);
  const url = new URL(`https://sheets.googleapis.com/v4/${params.path}`);
  for (const [k, v] of Object.entries(params.query ?? {})) {
    url.searchParams.set(k, v);
  }
  const response = await fetch(url, {
    method: params.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: params.body === undefined ? undefined : JSON.stringify(params.body),
    signal: params.signal,
  });
  const json = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(json.error?.message ?? `Google Sheets HTTP ${response.status}`);
  }
  return json;
}

export function a1Range(sheet: string, range: string): string {
  const tab = sheet.includes(" ") || sheet.includes("!") ? `'${sheet.replace(/'/g, "''")}'` : sheet;
  const cleaned = range.includes("!") ? range.split("!").pop()! : range;
  return `${tab}!${cleaned}`;
}

/** Convert a values grid (header row + data) into objects. */
export function gridToObjects(values: string[][]): Record<string, unknown>[] {
  if (!values.length) return [];
  const headers = values[0]!.map((h) => String(h ?? "").trim());
  const rows: Record<string, unknown>[] = [];
  for (const row of values.slice(1)) {
    if (!row.some((cell) => String(cell ?? "").trim())) continue;
    const obj: Record<string, unknown> = {};
    headers.forEach((header, i) => {
      if (!header) return;
      obj[header] = row[i] ?? "";
    });
    rows.push(obj);
  }
  return rows;
}

export function objectToRow(headers: string[], values: Record<string, unknown>): string[] {
  return headers.map((h) => {
    const v = values[h];
    if (v === undefined || v === null) return "";
    return typeof v === "string" ? v : JSON.stringify(v);
  });
}

export async function googleListSheetTitles(params: {
  account: GoogleServiceAccount;
  spreadsheetId: string;
  signal: AbortSignal;
}): Promise<string[]> {
  const meta = await sheetsFetch<{
    sheets?: Array<{ properties?: { title?: string } }>;
  }>({
    account: params.account,
    path: `spreadsheets/${encodeURIComponent(params.spreadsheetId)}`,
    query: { fields: "sheets.properties.title" },
    signal: params.signal,
  });
  return (meta.sheets ?? [])
    .map((s) => s.properties?.title?.trim() ?? "")
    .filter(Boolean);
}

/** Create a tab if it does not exist yet. */
export async function googleEnsureSheetTab(params: {
  account: GoogleServiceAccount;
  spreadsheetId: string;
  sheet: string;
  signal: AbortSignal;
}): Promise<void> {
  const titles = await googleListSheetTitles(params);
  if (titles.some((t) => t.toLowerCase() === params.sheet.toLowerCase())) return;
  await sheetsFetch({
    account: params.account,
    method: "POST",
    path: `spreadsheets/${encodeURIComponent(params.spreadsheetId)}:batchUpdate`,
    body: {
      requests: [{ addSheet: { properties: { title: params.sheet } } }],
    },
    signal: params.signal,
  });
}

export async function googleReadRows(params: {
  account: GoogleServiceAccount;
  spreadsheetId: string;
  sheet: string;
  range: string;
  signal: AbortSignal;
}): Promise<{ rows: Record<string, unknown>[]; raw: string[][] }> {
  await googleEnsureSheetTab(params);
  const range = a1Range(params.sheet, params.range);
  const data = await sheetsFetch<{ values?: string[][] }>({
    account: params.account,
    path: `spreadsheets/${encodeURIComponent(params.spreadsheetId)}/values/${encodeURIComponent(range)}`,
    signal: params.signal,
  });
  const raw = data.values ?? [];
  return { rows: gridToObjects(raw), raw };
}

export async function googleEnsureHeaderAndAppend(params: {
  account: GoogleServiceAccount;
  spreadsheetId: string;
  sheet: string;
  values: Record<string, unknown>;
  signal: AbortSignal;
}): Promise<{ updatedRange?: string; rowIndex: number }> {
  await googleEnsureSheetTab(params);
  const headerRange = a1Range(params.sheet, "A1:Z1");
  const existing = await sheetsFetch<{ values?: string[][] }>({
    account: params.account,
    path: `spreadsheets/${encodeURIComponent(params.spreadsheetId)}/values/${encodeURIComponent(headerRange)}`,
    signal: params.signal,
  });

  let headers = (existing.values?.[0] ?? []).map((h) => String(h ?? "").trim()).filter(Boolean);
  if (headers.length === 0) {
    headers = Object.keys(params.values);
    await sheetsFetch({
      account: params.account,
      method: "PUT",
      path: `spreadsheets/${encodeURIComponent(params.spreadsheetId)}/values/${encodeURIComponent(a1Range(params.sheet, "A1"))}`,
      query: { valueInputOption: "USER_ENTERED" },
      body: { values: [headers] },
      signal: params.signal,
    });
  } else {
    // Add any new keys as extra columns on the right.
    const missing = Object.keys(params.values).filter((k) => !headers.includes(k));
    if (missing.length) {
      headers = [...headers, ...missing];
      await sheetsFetch({
        account: params.account,
        method: "PUT",
        path: `spreadsheets/${encodeURIComponent(params.spreadsheetId)}/values/${encodeURIComponent(a1Range(params.sheet, "A1"))}`,
        query: { valueInputOption: "USER_ENTERED" },
        body: { values: [headers] },
        signal: params.signal,
      });
    }
  }

  const row = objectToRow(headers, params.values);
  const appendRange = a1Range(params.sheet, "A:Z");
  const result = await sheetsFetch<{ updates?: { updatedRange?: string; updatedRows?: number } }>({
    account: params.account,
    method: "POST",
    path: `spreadsheets/${encodeURIComponent(params.spreadsheetId)}/values/${encodeURIComponent(appendRange)}:append`,
    query: {
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
    },
    body: { values: [row] },
    signal: params.signal,
  });

  const updatedRange = result.updates?.updatedRange;
  const rowMatch = updatedRange?.match(/![A-Z]+(\d+)/i);
  const rowIndex = rowMatch ? Number(rowMatch[1]) - 1 : -1;
  return { updatedRange, rowIndex };
}

/** Clear cached token (tests). */
export function resetGoogleTokenCache(): void {
  tokenCache = null;
}
