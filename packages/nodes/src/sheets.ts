import { prisma } from "@flowforge/db";
import { NODE_TYPES } from "@flowforge/shared";
import {
  googleEnsureHeaderAndAppend,
  googleReadRows,
  loadGoogleServiceAccount,
  looksLikeGoogleSpreadsheetId,
} from "./googleSheets.js";
import { asString, deepInterpolate, interpolateJsonTemplate } from "./interpolate.js";
import { connectorStrict, sheetsMock } from "./strict.js";
import type { NodeDefinition } from "./types.js";

const SAMPLE_TOPICS = [
  { Topic: "AI workflow automation trends", Keywords: "ai, automation, no-code" },
  { Topic: "Customer support with LLMs", Keywords: "support, llm, triage" },
  { Topic: "Meeting notes that write themselves", Keywords: "meetings, summary, productivity" },
];

const LOCAL_CALENDAR_KEYS = new Set(["content-calendar", "sales-sheet-id", "meetings-sheet-id"]);

function rowFields(data: unknown): Record<string, unknown> {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return { value: data };
}

function pickTopic(fields: Record<string, unknown>): { topic: string; keywords: string } {
  const topic = asString(fields.Topic ?? fields.topic, "Untitled topic");
  const keywords = asString(fields.Keywords ?? fields.keywords, topic);
  return { topic, keywords };
}

function pickStatus(values: unknown): string {
  if (values && typeof values === "object" && "Status" in (values as object)) {
    return String((values as Record<string, unknown>).Status);
  }
  if (values && typeof values === "object" && "status" in (values as object)) {
    return String((values as Record<string, unknown>).status);
  }
  return "ok";
}

function chooseTopicRow(rows: Record<string, unknown>[]): Record<string, unknown> {
  const pending = rows.find((r) => {
    const status = asString(r.Status ?? r.status).toLowerCase();
    return !status || status === "pending" || status === "new";
  });
  return pending ?? rows[0]!;
}

function resolveSpreadsheetId(
  configValue: unknown,
  env: Record<string, string | undefined>,
): string {
  return (
    asString(configValue).trim() ||
    env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() ||
    "content-calendar"
  );
}

function resolveBackend(
  spreadsheetId: string,
  env: Record<string, string | undefined>,
): "mock" | "google" | "postgres" {
  if (sheetsMock(env)) return "mock";
  if (LOCAL_CALENDAR_KEYS.has(spreadsheetId) || !looksLikeGoogleSpreadsheetId(spreadsheetId)) {
    return "postgres";
  }
  const account = loadGoogleServiceAccount(env);
  if (account) return "google";
  if (connectorStrict(env)) {
    throw new Error(
      `Spreadsheet "${spreadsheetId}" looks like a Google Sheet ID, but no service account is configured. Set GOOGLE_SERVICE_ACCOUNT_JSON (or EMAIL + PRIVATE_KEY) in .env and share the sheet with that service-account email as Editor.`,
    );
  }
  return "postgres";
}

async function ensureCalendar(spreadsheetId: string) {
  return prisma.contentCalendar.upsert({
    where: { spreadsheetId },
    update: {},
    create: {
      spreadsheetId,
      title: spreadsheetId,
    },
  });
}

function parseAppendValues(
  rawValues: unknown,
  interp: { input: unknown; trigger: unknown; steps: Record<string, unknown>; now: string },
): Record<string, unknown> {
  let values: unknown = rawValues;

  // Engine may already have JSON-safe-interpolated the template into an object.
  if (values && typeof values === "object" && !Array.isArray(values)) {
    values = deepInterpolate(values, interp);
  } else if (typeof rawValues === "string") {
    try {
      values = /\{\{/.test(rawValues)
        ? interpolateJsonTemplate(rawValues, interp)
        : JSON.parse(rawValues);
    } catch (err) {
      throw new Error(
        `Sheets append "values" is not valid JSON after mapping: ${
          err instanceof Error ? err.message : String(err)
        }. Keep Status as a plain string (e.g. "approved") and use {{ steps... }} only inside quoted fields.`,
      );
    }
  } else {
    values = deepInterpolate(rawValues ?? {}, interp);
  }

  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return { value: values };
  }
  return values as Record<string, unknown>;
}

export const sheetsReadNode: NodeDefinition = {
  type: NODE_TYPES.SHEETS_READ,
  version: 1,
  displayName: "Sheets: Read Rows",
  category: "connector",
  description: "Fetch rows from Google Sheets or the local content calendar",
  async execute(ctx) {
    const spreadsheetId = resolveSpreadsheetId(ctx.config.spreadsheetId, ctx.env);
    const sheet = asString(ctx.config.sheet, "Sheet1");
    const range = asString(ctx.config.range, "A1:Z1000");
    const backend = resolveBackend(spreadsheetId, ctx.env);

    if (backend === "mock") {
      const rows = SAMPLE_TOPICS;
      const first = rows[0]!;
      return {
        output: {
          spreadsheetId,
          sheet,
          range,
          rows,
          topic: first.Topic,
          keywords: first.Keywords,
          backend: "mock",
          mocked: true,
        },
        logs: [
          {
            level: "warn",
            message: `Sheets read mocked (${rows.length} sample rows from ${sheet}!${range})`,
            at: ctx.now().toISOString(),
          },
        ],
      };
    }

    if (backend === "google") {
      const account = loadGoogleServiceAccount(ctx.env)!;
      const { rows } = await googleReadRows({
        account,
        spreadsheetId,
        sheet,
        range,
        signal: ctx.signal,
      });
      if (rows.length === 0) {
        throw new Error(
          `Google Sheet "${spreadsheetId}" tab "${sheet}" has no data rows. Add a header row (Topic, Keywords, Status) plus at least one topic.`,
        );
      }
      const chosen = chooseTopicRow(rows);
      const { topic, keywords } = pickTopic(chosen);
      return {
        output: {
          spreadsheetId,
          sheet,
          range,
          rows,
          topic,
          keywords,
          backend: "google",
          mocked: false,
        },
        logs: [
          {
            level: "info",
            message: `Google Sheets read ${rows.length} row(s) from ${spreadsheetId}/${sheet}; using topic "${topic}"`,
            at: ctx.now().toISOString(),
          },
        ],
      };
    }

    const calendar = await ensureCalendar(spreadsheetId);
    const dbRows = await prisma.contentCalendarRow.findMany({
      where: { calendarId: calendar.id, sheet },
      orderBy: { rowIndex: "asc" },
    });

    if (dbRows.length === 0) {
      throw new Error(
        `No rows in local calendar "${spreadsheetId}" sheet "${sheet}". Seed Topics, or paste a real Google Spreadsheet ID and configure GOOGLE_SERVICE_ACCOUNT_JSON.`,
      );
    }

    const rows: Record<string, unknown>[] = dbRows.map((r: { data: unknown }) => rowFields(r.data));
    const chosen = chooseTopicRow(rows);
    const { topic, keywords } = pickTopic(chosen);

    return {
      output: {
        spreadsheetId,
        sheet,
        range,
        rows,
        topic,
        keywords,
        backend: "postgres",
        mocked: false,
      },
      logs: [
        {
          level: "info",
          message: `Local calendar read ${rows.length} row(s) from ${spreadsheetId}/${sheet}; using topic "${topic}"`,
          at: ctx.now().toISOString(),
        },
      ],
    };
  },
};

export const sheetsAppendNode: NodeDefinition = {
  type: NODE_TYPES.SHEETS_APPEND,
  version: 1,
  displayName: "Sheets: Insert Row",
  category: "connector",
  description: "Append a row to Google Sheets or the local content calendar",
  async execute(ctx) {
    const interp = {
      input: ctx.input,
      trigger: ctx.trigger,
      steps: ctx.steps,
      now: ctx.now().toISOString(),
    };
    const spreadsheetId = resolveSpreadsheetId(ctx.config.spreadsheetId, ctx.env);
    const sheet = asString(ctx.config.sheet, "Sheet1");
    const values = parseAppendValues(ctx.config.values, interp);
    const status = pickStatus(values);
    const backend = resolveBackend(spreadsheetId, ctx.env);

    if (backend === "mock") {
      return {
        output: {
          spreadsheetId,
          sheet,
          values,
          status,
          statusLower: status.toLowerCase(),
          appendedAt: ctx.now().toISOString(),
          backend: "mock",
          mocked: true,
        },
        logs: [
          {
            level: "warn",
            message: `Sheets append mocked → ${sheet}: ${JSON.stringify(values)}`,
            at: ctx.now().toISOString(),
          },
        ],
      };
    }

    if (backend === "google") {
      const account = loadGoogleServiceAccount(ctx.env)!;
      const result = await googleEnsureHeaderAndAppend({
        account,
        spreadsheetId,
        sheet,
        values,
        signal: ctx.signal,
      });
      return {
        output: {
          spreadsheetId,
          sheet,
          values,
          status,
          statusLower: status.toLowerCase(),
          rowIndex: result.rowIndex,
          updatedRange: result.updatedRange,
          appendedAt: ctx.now().toISOString(),
          backend: "google",
          mocked: false,
        },
        logs: [
          {
            level: "info",
            message: `Google Sheets append → ${spreadsheetId}/${sheet} ${result.updatedRange ?? ""} (status=${status})`,
            at: ctx.now().toISOString(),
          },
        ],
      };
    }

    const calendar = await ensureCalendar(spreadsheetId);
    const agg = await prisma.contentCalendarRow.aggregate({
      where: { calendarId: calendar.id, sheet },
      _max: { rowIndex: true },
    });
    const nextIndex = (agg._max.rowIndex ?? -1) + 1;
    const created = await prisma.contentCalendarRow.create({
      data: {
        calendarId: calendar.id,
        sheet,
        rowIndex: nextIndex,
        data: values as object,
      },
    });

    return {
      output: {
        spreadsheetId,
        sheet,
        values,
        status,
        statusLower: status.toLowerCase(),
        rowId: created.id,
        rowIndex: created.rowIndex,
        appendedAt: ctx.now().toISOString(),
        backend: "postgres",
        mocked: false,
      },
      logs: [
        {
          level: "info",
          message: `Local calendar append → ${spreadsheetId}/${sheet} row ${created.rowIndex} (status=${status})`,
          at: ctx.now().toISOString(),
        },
      ],
    };
  },
};
