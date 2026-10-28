import {
  googleEnsureHeaderAndAppend,
  googleListSheetTitles,
  googleReadRows,
  loadGoogleServiceAccount,
  looksLikeGoogleSpreadsheetId,
} from "@flowforge/nodes";

const env = process.env;
const id = env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() || "";
console.log("spreadsheetId", id);
console.log("looksGoogle", looksLikeGoogleSpreadsheetId(id));

const account = loadGoogleServiceAccount(env);
console.log("saEmail", account?.client_email ?? "MISSING");
if (!account || !id) process.exit(1);

const titles = await googleListSheetTitles({
  account,
  spreadsheetId: id,
  signal: AbortSignal.timeout(20_000),
});
console.log("existingTabs", titles);

const topics = await googleReadRows({
  account,
  spreadsheetId: id,
  sheet: "Topics",
  range: "A1:F100",
  signal: AbortSignal.timeout(20_000),
});
console.log("Topics rows", topics.rows.length, "header", topics.raw[0] ?? null);

if (topics.rows.length === 0) {
  console.log("Seeding Topics…");
  for (const row of [
    {
      Topic: "AI workflow automation trends",
      Keywords: "ai, automation, no-code",
      Status: "pending",
    },
    {
      Topic: "Customer support with LLMs",
      Keywords: "support, llm, triage",
      Status: "pending",
    },
    {
      Topic: "Meeting notes that write themselves",
      Keywords: "meetings, summary, productivity",
      Status: "pending",
    },
  ]) {
    await googleEnsureHeaderAndAppend({
      account,
      spreadsheetId: id,
      sheet: "Topics",
      values: row,
      signal: AbortSignal.timeout(20_000),
    });
  }
}

// Ensure Drafts tab exists (empty until the pipeline appends)
await googleReadRows({
  account,
  spreadsheetId: id,
  sheet: "Drafts",
  range: "A1:F100",
  signal: AbortSignal.timeout(20_000),
});

const after = await googleListSheetTitles({
  account,
  spreadsheetId: id,
  signal: AbortSignal.timeout(20_000),
});
const topicsAfter = await googleReadRows({
  account,
  spreadsheetId: id,
  sheet: "Topics",
  range: "A1:F100",
  signal: AbortSignal.timeout(20_000),
});
console.log("tabsNow", after);
console.log("topicsNow", topicsAfter.rows.length, topicsAfter.rows[0]);
console.log("OK — open https://docs.google.com/spreadsheets/d/" + id + "/edit");
