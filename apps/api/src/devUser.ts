import { prisma } from "@flowforge/db";

const DEV_EMAIL = "dev@flowforge.local";

export async function getDevUserId(): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email: DEV_EMAIL } });
  if (existing) return existing.id;

  const created = await prisma.user.create({
    data: {
      email: DEV_EMAIL,
      displayName: "Dev User",
      passwordHash: "dev-no-login-yet",
    },
  });
  return created.id;
}
