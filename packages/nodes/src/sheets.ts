import { prisma } from "@flowforge/db";
import { NODE_TYPES } from "@flowforge/shared";
import {
  googleEnsureHeaderAndAppend,
  googleReadRows,
  loadGoogleServiceAccount,
  looksLikeGoogleSpreadsheetId,
} from "./googleSheets.js";
import { asString, deepInterpolate, interpolateJsonTemplate } from "./interpolate.js";
import { demoMode, sheetsMock } from "./strict.js";
import type { NodeDefinition } from "./types.js";

const SAMPLE_TOPICS = [
  { Topic: "AI workflow automation trends", Keywords: "ai, automation, no-code", Status: "pending" },
  { Topic: "Customer support with LLMs", Keywords: "support, llm, triage", Status: "pending" },
  { Topic: "Meeting notes that write themselves", Keywords: "meetings, summary, productivity", Status: "pending" },
];

const LOCAL_CALENDAR_KEYS = new Set(["content-calendar", "sales-sheet-id", "meetings-sheet-id"]);
const DEMO_CALENDAR_ID = "content-calendar";

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

type SheetsTarget = {
  spreadsheetId: string;
  backend: "mock" | "google" | "postgres";
  /** True when a Google Sheet ID was remapped to the local calendar. */
  remappedFromGoogleId?: string;
};

/**
 * Pick spreadsheet id + backend. Demo / missing Google SA always land on
 * Postgres `content-calendar` so shared demos never die on Sheet credentials.
 */
function resolveSheetsTarget(
  configValue: unknown,
  env: Record<string, string | undefined>,
): SheetsTarget {
  if (sheetsMock(env)) {
    return { spreadsheetId: DEMO_CALENDAR_ID, backend: "mock" };
  }

  if (demoMode(env)) {
    return { spreadsheetId: DEMO_CALENDAR_ID, backend: "postgres" };
  }

  const configured =
    asString(configValue).trim() || env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() || DEMO_CALENDAR_ID;

  if (LOCAL_CALENDAR_KEYS.has(configured) || !looksLikeGoogleSpreadsheetId(configured)) {
    return { spreadsheetId: configured, backend: "postgres" };
  }

  if (loadGoogleServiceAccount(env)) {
    return { spreadsheetId: configured, backend: "google" };
  }

  // Google ID present but no service account → local calendar (never hard-fail demos).
  return {
    spreadsheetId: DEMO_CALENDAR_ID,
    backend: "postgres",
    remappedFromGoogleId: configured,
  };
}

async function ensureTopicSeed(calendarId: string, sheet: string): Promise<void> {
  if (sheet !== "Topics") return;
  const count = await prisma.contentCalendarRow.count({
    where: { calendarId, sheet },
  });
  if (count > 0) return;
  await prisma.contentCalendarRow.createMany({
    data: SAMPLE_TOPICS.map((data, rowIndex) => ({
      calendarId,
      sheet,
      rowIndex,
      data,
    })),
  });
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
    const target = resolveSheetsTarget(ctx.config.spreadsheetId, ctx.env);
    const { spreadsheetId, backend } = target;
    const sheet = asString(ctx.config.sheet, "Sheet1");
    const range = asString(ctx.config.range, "A1:Z1000");
    const remapLog = target.remappedFromGoogleId
      ? [
          {
            level: "warn" as const,
            message: `No Google service account configured for "${target.remappedFromGoogleId}" — using local Postgres calendar "${DEMO_CALENDAR_ID}" instead.`,
            at: ctx.now().toISOString(),
          },
        ]
      : [];

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
          ...remapLog,
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
    await ensureTopicSeed(calendar.id, sheet);
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
        ...remapLog,
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
    const target = resolveSheetsTarget(ctx.config.spreadsheetId, ctx.env);
    const { spreadsheetId, backend } = target;
    const sheet = asString(ctx.config.sheet, "Sheet1");
    const values = parseAppendValues(ctx.config.values, interp);
    const status = pickStatus(values);
    const remapLog = target.remappedFromGoogleId
      ? [
          {
            level: "warn" as const,
            message: `No Google service account configured for "${target.remappedFromGoogleId}" — using local Postgres calendar "${DEMO_CALENDAR_ID}" instead.`,
            at: ctx.now().toISOString(),
          },
        ]
      : [];

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
          ...remapLog,
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
        ...remapLog,
        {
          level: "info",
          message: `Local calendar append → ${spreadsheetId}/${sheet} row ${created.rowIndex} (status=${status})`,
          at: ctx.now().toISOString(),
        },
      ],
    };
  },
};
