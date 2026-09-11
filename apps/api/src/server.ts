import Fastify from "fastify";
import cors from "@fastify/cors";
import { listNodeTypes } from "@flowforge/nodes";

const port = Number(process.env.API_PORT ?? 3001);
const origin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin,
    credentials: true,
  });

  app.get("/health", async () => ({ status: "ok", service: "flowforge-api" }));

  app.get("/ready", async (_req, reply) => {
    // DB readiness wired when Prisma migrations are applied (Week 3–4).
    return reply.send({ status: "ready", database: "not-checked-yet" });
  });

  app.get("/api/v1/node-types", async () => ({ items: listNodeTypes() }));

  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
