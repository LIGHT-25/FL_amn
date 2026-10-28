import { describe, expect, it } from "vitest";
import { gridToObjects, looksLikeGoogleSpreadsheetId, objectToRow } from "./googleSheets.js";

describe("googleSheets helpers", () => {
  it("detects Google spreadsheet IDs vs local calendar keys", () => {
    expect(looksLikeGoogleSpreadsheetId("content-calendar")).toBe(false);
    expect(looksLikeGoogleSpreadsheetId("1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms")).toBe(true);
  });

  it("maps header grids to objects and back", () => {
    const rows = gridToObjects([
      ["Topic", "Keywords", "Status"],
      ["AI trends", "ai, automation", "pending"],
    ]);
    expect(rows).toEqual([
      { Topic: "AI trends", Keywords: "ai, automation", Status: "pending" },
    ]);
    expect(objectToRow(["Topic", "Status"], { Topic: "Hello", Status: "approved", Extra: "x" })).toEqual([
      "Hello",
      "approved",
    ]);
  });
});
