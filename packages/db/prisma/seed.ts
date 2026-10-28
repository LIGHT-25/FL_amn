import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TOPICS = [
  { Topic: "AI workflow automation trends", Keywords: "ai, automation, no-code", Status: "pending" },
  { Topic: "Customer support with LLMs", Keywords: "support, llm, triage", Status: "pending" },
  { Topic: "Meeting notes that write themselves", Keywords: "meetings, summary, productivity", Status: "pending" },
];

async function main() {
  const email = "dev@flowforge.local";
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      displayName: "Dev User",
    },
    create: {
      email,
      displayName: "Dev User",
      // Auth arrives later; placeholder hash so the row is valid.
      passwordHash: "dev-no-login-yet",
    },
  });

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

  console.log(`@flowforge/db seed: ready as ${user.email} (${user.id})`);
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
