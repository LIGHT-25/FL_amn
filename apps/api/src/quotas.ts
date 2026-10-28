import { Cron } from "croner";
import { prisma } from "@flowforge/db";

const MAX_WORKFLOWS = Number(process.env.DEMO_MAX_WORKFLOWS ?? 15);
const MAX_ACTIVE_SCHEDULES = Number(process.env.DEMO_MAX_ACTIVE_SCHEDULES ?? 2);
const MAX_RUNS_PER_DAY = Number(process.env.DEMO_MAX_RUNS_PER_DAY ?? 20);
const MIN_SCHEDULE_MINUTES = Number(process.env.DEMO_MIN_SCHEDULE_MINUTES ?? 15);

export class QuotaError extends Error {
  code: string;
  statusCode: number;
  constructor(code: string, message: string, statusCode = 429) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function assertCanCreateWorkflow(userId: string): Promise<void> {
  const count = await prisma.workflow.count({ where: { userId } });
  if (count >= MAX_WORKFLOWS) {
    throw new QuotaError(
      "QUOTA_EXCEEDED",
      `Demo limit: at most ${MAX_WORKFLOWS} workflows per account.`,
    );
  }
}

export async function assertCanActivateSchedule(
  userId: string,
  workflowId: string,
  cronExpr: string,
  timezone: string,
): Promise<void> {
  assertScheduleInterval(cronExpr, timezone);

  const active = await prisma.workflow.count({
    where: { userId, status: "ACTIVE", NOT: { id: workflowId } },
  });
  if (active >= MAX_ACTIVE_SCHEDULES) {
    throw new QuotaError(
      "QUOTA_EXCEEDED",
      `Demo limit: at most ${MAX_ACTIVE_SCHEDULES} hosted (ACTIVE) schedules per account.`,
    );
  }
}

export function assertScheduleInterval(cronExpr: string, timezone: string): void {
  try {
    const job = new Cron(cronExpr, { timezone: timezone || "UTC", paused: true });
    const next = job.nextRuns(2, new Date());
    if (next.length < 2) return;
    const gapMs = next[1]!.getTime() - next[0]!.getTime();
    if (gapMs < MIN_SCHEDULE_MINUTES * 60_000) {
      throw new QuotaError(
        "QUOTA_EXCEEDED",
        `Demo limit: schedule interval must be at least ${MIN_SCHEDULE_MINUTES} minutes.`,
        400,
      );
    }
  } catch (err) {
    if (err instanceof QuotaError) throw err;
    throw new QuotaError("INVALID_CRON", "Invalid schedule cron expression.", 400);
  }
}

export async function assertCanRun(userId: string): Promise<void> {
  const inFlight = await prisma.execution.count({
    where: { userId, status: { in: ["QUEUED", "RUNNING"] } },
  });
  if (inFlight >= 1) {
    throw new QuotaError(
      "QUOTA_EXCEEDED",
      "Demo limit: only one run in flight per account. Wait for it to finish.",
    );
  }

  const since = startOfUtcDay();
  const runsToday = await prisma.execution.count({
    where: { userId, createdAt: { gte: since } },
  });
  if (runsToday >= MAX_RUNS_PER_DAY) {
    throw new QuotaError(
      "QUOTA_EXCEEDED",
      `Demo limit: ${MAX_RUNS_PER_DAY} runs per day. Try again tomorrow.`,
    );
  }
}

export async function getQuotaSnapshot(userId: string): Promise<{
  runsToday: number;
  runsLimit: number;
  runsRemaining: number;
  workflows: number;
  workflowsLimit: number;
  activeSchedules: number;
  activeSchedulesLimit: number;
  demoMode: boolean;
  publishEnabled: boolean;
}> {
  const since = startOfUtcDay();
  const [runsToday, workflows, activeSchedules] = await Promise.all([
    prisma.execution.count({ where: { userId, createdAt: { gte: since } } }),
    prisma.workflow.count({ where: { userId } }),
    prisma.workflow.count({ where: { userId, status: "ACTIVE" } }),
  ]);
  const demoMode = (process.env.DEMO_MODE ?? "false").toLowerCase() === "true";
  const publishEnabled =
    (process.env.DEMO_PUBLISH_ENABLED ?? (demoMode ? "false" : "true")).toLowerCase() === "true";
  return {
    runsToday,
    runsLimit: MAX_RUNS_PER_DAY,
    runsRemaining: Math.max(0, MAX_RUNS_PER_DAY - runsToday),
    workflows,
    workflowsLimit: MAX_WORKFLOWS,
    activeSchedules,
    activeSchedulesLimit: MAX_ACTIVE_SCHEDULES,
    demoMode,
    publishEnabled,
  };
}
