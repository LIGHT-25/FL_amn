# FlowForge

Self-hostable visual workflow automation (n8n / Activepieces–style) — final-year project MVP.

## Foundation documents

1. [SRS](docs/01-srs/software-requirements-specification.md) — requirements & MVP boundary  
2. [SDD](docs/02-sdd/software-design-description.md) — architecture, schema, APIs  
3. [STP + Schedule](docs/03-stp-schedule/software-test-plan-and-schedule.md) — tests, Gantt, demo script  

## Stack

- **Web:** React + Vite (+ React Flow in later weeks)  
- **API:** Fastify  
- **Engine / nodes:** TypeScript packages  
- **DB:** PostgreSQL + Prisma  
- **Queue (stretch):** Redis + BullMQ  

## Quick start

```bash
cp .env.example .env
pnpm install
docker compose up -d postgres redis
pnpm --filter @flowforge/shared build
pnpm --filter @flowforge/engine build
pnpm --filter @flowforge/nodes build
pnpm --filter @flowforge/api dev
# other terminal
pnpm --filter @flowforge/web dev
```

- Web: http://localhost:5173  
- API health: http://localhost:3001/health  
- Node types: http://localhost:3001/api/v1/node-types  

Prisma migrate/seed after Week 3–4 auth work lands.

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm test` | Run package tests (engine validation suite included) |
| `pnpm build` | Build all packages/apps |
| `pnpm typecheck` | TypeScript check |

## Roadmap

See STP Weeks 1–20. Next implementation slice: auth + Prisma migrations + workflow CRUD.
