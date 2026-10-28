import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

/** Load repo-root .env when present (local seed). Docker Compose already injects env. */
function loadLocalEnvFile() {
  const candidates = [resolve(process.cwd(), "../../.env"), resolve(process.cwd(), ".env")];
  for (const file of candidates) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    }
    break;
  }
}

loadLocalEnvFile();

const prisma = new PrismaClient();

const TOPICS = [
  { Topic: "AI workflow automation trends", Keywords: "ai, automation, no-code", Status: "pending" },
  { Topic: "Customer support with LLMs", Keywords: "support, llm, triage", Status: "pending" },
  { Topic: "Meeting notes that write themselves", Keywords: "meetings, summary, productivity", Status: "pending" },
];

async function upsertUser(email: string, displayName: string, password: string) {
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  return prisma.user.upsert({
    where: { email },
    update: { displayName, passwordHash },
    create: { email, displayName, passwordHash },
  });
}

async function main() {
  const demoPassword = process.env.DEMO_USER_PASSWORD ?? "demo-flowforge";
  const demo = await upsertUser("demo@flowforge.local", "Demo Operator", demoPassword);

  // Local-only convenience account (ALLOW_DEV_USER=true). Same default password as demo.
  if ((process.env.SEED_DEV_USER ?? "true").toLowerCase() === "true") {
    await upsertUser("dev@flowforge.local", "Dev User", process.env.DEV_USER_PASSWORD ?? demoPassword);
  }

  const calendar = await prisma.contentCalendar.upsert({
    where: { spreadsheetId: "content-calendar" },
    update: { title: "Content Pipeline calendar" },
    create: {
      spreadsheetId: "content-calendar",
      title: "Content Pipeline calendar",
    },
  });

  const existingTopics = await prisma.contentCalendarRow.count({
    where: { calendarId: calendar.id, sheet: "Topics" },
  });
  if (existingTopics === 0) {
    await prisma.contentCalendarRow.createMany({
      data: TOPICS.map((data, rowIndex) => ({
        calendarId: calendar.id,
        sheet: "Topics",
        rowIndex,
        data,
      })),
    });
  }

  console.log(`@flowforge/db seed: demo user ${demo.email} (password from DEMO_USER_PASSWORD or demo-flowforge)`);
  console.log(`@flowforge/db seed: content-calendar Topics rows ready`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
