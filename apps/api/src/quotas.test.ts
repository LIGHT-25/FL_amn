import { describe, expect, it } from "vitest";
import { QuotaError, assertScheduleInterval } from "./quotas.js";

describe("assertScheduleInterval", () => {
  it("allows hourly cron", () => {
    expect(() => assertScheduleInterval("0 * * * *", "UTC")).not.toThrow();
  });

  it("rejects every-minute cron", () => {
    expect(() => assertScheduleInterval("* * * * *", "UTC")).toThrow(QuotaError);
  });

  it("rejects 5-minute interval", () => {
    expect(() => assertScheduleInterval("*/5 * * * *", "UTC")).toThrow(QuotaError);
  });
});
