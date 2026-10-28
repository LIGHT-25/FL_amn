import type { FastifyPluginAsync } from "fastify";
import { prisma } from "@flowforge/db";
import {
  assertEmail,
  assertPassword,
  displayNameFromEmail,
  hashPassword,
  verifyPassword,
} from "./password.js";
import {
  REFRESH_COOKIE,
  createRefreshToken,
  hashRefreshToken,
  refreshCookieOptions,
  signAccessToken,
} from "./tokens.js";
import { requireAuth } from "./plugin.js";

type AuthBody = { email?: string; password?: string; displayName?: string };

async function issueSession(
  reply: { setCookie: (name: string, value: string, opts: object) => void; clearCookie: (name: string, opts: object) => void },
  user: { id: string; email: string; displayName: string },
  meta: { userAgent?: string; ip?: string },
) {
  const accessToken = await signAccessToken({ sub: user.id, email: user.email });
  const refresh = createRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refresh.hash,
      expiresAt: refresh.expiresAt,
      userAgent: meta.userAgent?.slice(0, 512),
      ipAddress: meta.ip?.slice(0, 64),
    },
  });
  reply.setCookie(REFRESH_COOKIE, refresh.raw, refreshCookieOptions());
  return {
    accessToken,
    tokenType: "Bearer" as const,
    expiresIn: 900,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    },
  };
}

const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: AuthBody }>("/api/v1/auth/register", {
    config: { rateLimit: { max: 5, timeWindow: "1 hour" } },
    handler: async (req, reply) => {
      try {
        const email = assertEmail(req.body?.email ?? "");
        assertPassword(req.body?.password ?? "");
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          return reply.status(409).send({
            code: "EMAIL_TAKEN",
            message: "An account with this email already exists. Sign in instead.",
          });
        }
        const displayName =
          (req.body?.displayName?.trim() || displayNameFromEmail(email)).slice(0, 80);
        const passwordHash = await hashPassword(req.body!.password!);
        const user = await prisma.user.create({
          data: { email, displayName, passwordHash },
        });
        const session = await issueSession(reply, user, {
          userAgent: req.headers["user-agent"],
          ip: req.ip,
        });
        return reply.status(201).send(session);
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode ?? 500;
        const code = (err as { code?: string }).code ?? "REGISTER_FAILED";
        if (status < 500) {
          return reply.status(status).send({
            code,
            message: err instanceof Error ? err.message : String(err),
          });
        }
        throw err;
      }
    },
  });

  app.post<{ Body: AuthBody }>("/api/v1/auth/login", {
    config: { rateLimit: { max: 20, timeWindow: "15 minutes" } },
    handler: async (req, reply) => {
      try {
        const email = assertEmail(req.body?.email ?? "");
        assertPassword(req.body?.password ?? "");
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await verifyPassword(user.passwordHash, req.body!.password!))) {
          return reply.status(401).send({
            code: "INVALID_CREDENTIALS",
            message: "Incorrect email or password.",
          });
        }
        const session = await issueSession(reply, user, {
          userAgent: req.headers["user-agent"],
          ip: req.ip,
        });
        return session;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode ?? 500;
        if (status < 500) {
          return reply.status(status).send({
            code: (err as { code?: string }).code ?? "LOGIN_FAILED",
            message: err instanceof Error ? err.message : String(err),
          });
        }
        throw err;
      }
    },
  });

  app.post("/api/v1/auth/refresh", async (req, reply) => {
    const raw = req.cookies[REFRESH_COOKIE];
    if (!raw) {
      return reply.status(401).send({ code: "NO_REFRESH", message: "Refresh token missing" });
    }
    const tokenHash = hashRefreshToken(raw);
    const stored = await prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
      include: { user: true },
    });
    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      reply.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
      return reply.status(401).send({ code: "REFRESH_EXPIRED", message: "Session expired. Sign in again." });
    }

    const next = createRefreshToken();
    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      }),
      prisma.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: next.hash,
          expiresAt: next.expiresAt,
          replacedByTokenId: undefined,
          userAgent: req.headers["user-agent"]?.slice(0, 512),
          ipAddress: req.ip?.slice(0, 64),
        },
      }),
    ]);
    // Link rotation (best-effort after create).
    const created = await prisma.refreshToken.findFirst({
      where: { tokenHash: next.hash, userId: stored.userId },
      orderBy: { createdAt: "desc" },
    });
    if (created) {
      await prisma.refreshToken.update({
        where: { id: stored.id },
        data: { replacedByTokenId: created.id },
      });
    }

    reply.setCookie(REFRESH_COOKIE, next.raw, refreshCookieOptions());
    const accessToken = await signAccessToken({
      sub: stored.user.id,
      email: stored.user.email,
    });
    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn: 900,
      user: {
        id: stored.user.id,
        email: stored.user.email,
        displayName: stored.user.displayName,
      },
    };
  });

  app.post("/api/v1/auth/logout", async (req, reply) => {
    const raw = req.cookies[REFRESH_COOKIE];
    if (raw) {
      const tokenHash = hashRefreshToken(raw);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    reply.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
    return reply.status(204).send();
  });

  app.get("/api/v1/auth/me", { preHandler: requireAuth }, async (req) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) {
      return { id: req.userId, email: "", displayName: "Unknown" };
    }
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    };
  });
};

export default authRoutes;
