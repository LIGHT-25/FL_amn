import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { getDevUserId } from "../devUser.js";
import { verifyAccessToken } from "./tokens.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

const PUBLIC_PREFIXES = [
  "/health",
  "/ready",
  "/api/v1/auth/register",
  "/api/v1/auth/login",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
  "/api/v1/node-types",
];

function isPublicPath(url: string): boolean {
  const path = url.split("?")[0] ?? url;
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

async function resolveBearerUserId(req: FastifyRequest): Promise<string | null> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;
  try {
    const claims = await verifyAccessToken(token);
    return claims.sub;
  } catch {
    return null;
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const userId = await resolveBearerUserId(req);
  if (userId) {
    req.userId = userId;
    return;
  }
  if ((process.env.ALLOW_DEV_USER ?? "false").toLowerCase() === "true") {
    req.userId = await getDevUserId();
    return;
  }
  return reply.status(401).send({ code: "UNAUTHORIZED", message: "Sign in required" });
}

/** Register on the root Fastify instance (not an encapsulated plugin) so hooks apply to all routes. */
export async function registerAuth(app: FastifyInstance): Promise<void> {
  app.decorateRequest("userId", "");
  app.addHook("preHandler", async (req, reply) => {
    if (isPublicPath(req.url)) return;
    if (reply.sent) return;
    await requireAuth(req, reply);
  });
}
