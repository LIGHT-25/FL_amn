import { googleReadRows, loadGoogleServiceAccount } from "@flowforge/nodes";

const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const account = loadGoogleServiceAccount(process.env)!;
const drafts = await googleReadRows({
  account,
  spreadsheetId: id,
  sheet: "Drafts",
  range: "A1:F20",
  signal: AbortSignal.timeout(20_000),
});
console.log("draftRows", drafts.rows.length);
console.log("header", drafts.raw[0]);
console.log("last", drafts.rows.at(-1));
