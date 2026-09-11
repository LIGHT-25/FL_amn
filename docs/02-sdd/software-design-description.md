# Software Design Description (SDD)

**Project:** FlowForge  
**Document ID:** FF-SDD-001  
**Version:** 1.0  
**Status:** Baseline  
**Date:** 2026-09-11  
**Implements:** FF-SRS-001

---

## 1. Design goals and constraints

| Goal | Design choice |
|------|----------------|
| Credible FYP systems story | Separate `engine` package; queue-ready boundary |
| Ship MVP in 16 weeks | Fastify (not Nest); in-process execution first |
| Safe secrets | Credential IDs in graph; AES-256-GCM at rest |
| Extensible nodes | Registry + Zod config schemas |
| Demo reliability | Docker Compose + Railway; mocks in CI |

**Constraints:** TypeScript monorepo; PostgreSQL; React Flow UI; no `eval` for expressions (stretch).

---

## 2. Architectural overview

FlowForge is a modular monolith with a headless execution core.

```text
┌──────────────┐   HTTPS/REST    ┌─────────────────────┐
│  apps/web    │◄──────────────►│  apps/api (Fastify)  │
│  React Flow  │                 │  Auth, CRUD, Hooks  │
└──────────────┘                 └──────────┬──────────┘
                                            │ execute / enqueue
                                 ┌──────────▼──────────┐
                                 │ packages/engine     │
                                 │ + packages/nodes    │
                                 └──────────┬──────────┘
                                            │
              ┌─────────────┬───────────────┼───────────────┐
              ▼             ▼               ▼               ▼
         PostgreSQL      Redis*        Slack/Discord    Airtable/HTTP
         (Prisma)      (stretch)         webhooks          APIs
```

\* Redis + `apps/worker` used only after Stretch 2; MVP calls engine inside API.

---

## 3. Context and containers

### 3.1 System context

- **Builders** use the web UI.
- **External systems** POST to `/hooks/:path`.
- **Third-party APIs** receive outbound connector calls.

### 3.2 Containers

| Container | Responsibility |
|-----------|----------------|
| `web` | SPA; talks only to API |
| `api` | Auth, persistence, webhooks, MVP execution |
| `worker` | Background execution (stretch) |
| `postgres` | System of record |
| `redis` | Job queue (stretch) |

---

## 4. Monorepo / module decomposition

```text
apps/web          → shared, ui
apps/api          → engine, nodes, db, shared
apps/worker       → engine, nodes, db, shared
packages/engine   → shared only
packages/nodes    → engine, shared
packages/db       → shared (Prisma)
packages/shared   → (leaf)
```

**Rule:** `engine` must not import Fastify, React, or Prisma models. Nodes receive DB-free `CredentialAccessor` and `SafeHttpClient`.

---

## 5. Runtime and deployment topology

### Development

`pnpm --filter api dev` + `pnpm --filter web dev` + Compose for Postgres (and Redis when needed).

### Production-like

```text
docker-compose.yml
  web (nginx static) → api → postgres
                     ↘ worker → redis (stretch profile)
```

Railway: public `web` + `api`; private `worker`; managed Postgres/Redis; env secrets.

---

## 6. Database ERD and ownership

All primary keys: UUID. Soft timestamps: `createdAt`, `updatedAt`.

### Entities

**User** — `email` unique, `passwordHash`, `displayName`

**RefreshToken** — `userId`, `tokenHash`, `expiresAt`, `revokedAt`, `replacedByTokenId?`

**Workflow** — `userId`, `name`, `description?`, `status` (`DRAFT`|`ACTIVE`|`INACTIVE`), `graphVersion` int, `graphJson` JSONB, `webhookPath` unique nullable, `lastActivatedAt?`

**Credential** — `userId`, `name`, `type`, `encryptedData`, `iv`, `authTag`, `encryptionVersion`, `lastTestedAt?`, `lastTestStatus?`

**WorkflowCredentialReference** (optional) — (`workflowId`, `credentialId`, `nodeId`) for delete checks

**Execution** — `workflowId`, `userId`, `triggerType` (`MANUAL`|`WEBHOOK`), `status` (`QUEUED`|`RUNNING`|`SUCCEEDED`|`FAILED`|`CANCELLED`), `workflowSnapshot` JSONB, `triggerData` JSONB, `startedAt`, `finishedAt?`, `durationMs?`, `errorCode?`, `errorMessage?`, `queueJobId?`

**NodeExecution** — `executionId`, `nodeId`, `nodeType`, `status` (`PENDING`|`RUNNING`|`SUCCEEDED`|`FAILED`|`SKIPPED`), `inputData`, `outputData`, `logs`, errors, timing, `sequence`

**AuditEvent** — `userId?`, `action`, `resourceType`, `resourceId`, `metadata` sanitized

### Ownership rule

Every read/write for Workflow, Credential, Execution is filtered by `userId = auth.sub`. Prefer `findFirst({ where: { id, userId } })` over fetch-then-check.

---

## 7. Flow JSON schema (v1)

```ts
type FlowDefinition = {
  schemaVersion: 1;
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: { x: number; y: number; zoom: number };
};

type FlowNode = {
  id: string;
  type: string;              // e.g. "trigger.webhook", "core.if"
  typeVersion: number;
  name: string;
  position: { x: number; y: number };
  disabled?: boolean;
  config: Record<string, unknown>;
  credentialRefs?: Record<string, string>; // slot → credential UUID
};

type FlowEdge = {
  id: string;
  source: string;
  sourceHandle?: string;     // "true" | "false" | "output" | ...
  target: string;
  targetHandle?: string;
};
```

### Server validation checklist

1. `schemaVersion === 1`
2. Unique node/edge IDs
3. Edges reference existing nodes
4. Known `type` + `typeVersion`
5. Zod-validate each node `config`
6. Exactly one trigger when activating
7. Triggers have no incoming edges
8. No cycles (DFS/Kahn)
9. Credential refs exist, owned by user, compatible type
10. At least one reachable executable path from trigger

---

## 8. DAG validation algorithm

1. Build adjacency list from edges (respecting handle metadata for IF).
2. Cycle detection via DFS colors (white/gray/black); gray back-edge ⇒ invalid.
3. Count nodes with `category === trigger`; activation requires exactly one.
4. Warn (non-blocking for draft save) on unreachable non-disabled nodes.
5. Return structured issues: `{ nodeId?, edgeId?, code, message, path? }`.

---

## 9. Execution algorithm and state machine

### Execution status

```text
QUEUED → RUNNING → SUCCEEDED
                 ↘ FAILED
                 ↘ CANCELLED (best-effort; stretch/partial)
```

### Algorithm (MVP)

1. Create `Execution` with `workflowSnapshot` + redacted `triggerData`; status `RUNNING`.
2. Load credential map for referenced IDs; decrypt in memory only.
3. Compute topological order of nodes reachable under **current branch choices** (recompute after IF).
4. For each next runnable node:
   - Mark `NodeExecution` RUNNING
   - Resolve config (literals MVP; expressions in Stretch 1)
   - `await definition.execute(ctx)`
   - Persist capped output; SUCCEEDED or FAILED
5. On failure: mark Execution FAILED; mark remaining dependents SKIPPED.
6. IF/Else: follow only edges whose `sourceHandle` matches `result.branch`.
7. Independent siblings: **sequential** in stable node-id order (deterministic logs).

### Delay

Uses `AbortSignal` + capped timeout (≤ 60s). Process restart may lose in-flight delays (documented MVP limitation; mitigated by Stretch 2).

---

## 10. Node plugin contract

```ts
interface NodeDefinition<TConfig, TInput, TOutput> {
  type: string;
  version: number;
  displayName: string;
  category: "trigger" | "core" | "connector";
  description: string;
  icon: string;
  inputHandles: HandleDefinition[];
  outputHandles: HandleDefinition[];
  configSchema: ZodType<TConfig>;
  credentialRequirements?: CredentialRequirement[];
  validate(config: TConfig, ctx: ValidationContext): NodeValidationIssue[];
  execute(ctx: NodeExecutionContext<TConfig, TInput>): Promise<NodeExecutionResult<TOutput>>;
}

interface NodeExecutionContext<TConfig, TInput> {
  executionId: string;
  workflowId: string;
  nodeId: string;
  config: TConfig;
  input: TInput;
  trigger: unknown;
  credentials: CredentialAccessor;
  http: SafeHttpClient;
  logger: SafeExecutionLogger;
  signal: AbortSignal;
  now(): Date;
}

interface NodeExecutionResult<TOutput> {
  output: TOutput;
  branch?: string;
  logs?: SafeLogEntry[];
}
```

**MVP node types**

| Type ID | Category |
|---------|----------|
| `trigger.manual` | trigger |
| `trigger.webhook` | trigger |
| `core.httpRequest` | core |
| `core.if` | core |
| `core.set` | core |
| `core.delay` | core |
| `core.log` | core |
| `slack.sendMessage` | connector |
| `discord.sendMessage` | connector |
| `airtable.createRecord` | connector |

---

## 11. Authentication and authorization

- Register/login with email + Argon2id password hash.
- Access JWT (short TTL, e.g. 15m) in `Authorization: Bearer`.
- Refresh token (longer TTL) HttpOnly Secure SameSite cookie; stored hashed; rotation on refresh.
- Logout revokes refresh token.
- Webhooks are public but bind to workflow ownership via path lookup; no user JWT required.

---

## 12. Credential encryption

- Master key: `CREDENTIALS_ENCRYPTION_KEY` (32-byte base64 or hex).
- Algorithm: AES-256-GCM; random 12-byte IV per write; store `iv`, `authTag`, ciphertext.
- `encryptionVersion` allows future key rotation schemes.
- Decrypt only inside worker/API execution or credential test; never log plaintext.
- Flow JSON stores only `credentialRefs` UUIDs.

---

## 13. API contracts

Prefix: `/api/v1`. Error shape: `{ code: string, message: string, details?: unknown }`.

### System

- `GET /health` — liveness
- `GET /ready` — DB (and Redis if enabled)
- `GET /api/v1/node-types` — palette metadata

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

### Workflows

- `GET|POST /api/v1/workflows`
- `GET|PATCH|DELETE /api/v1/workflows/:id`
- `POST /api/v1/workflows/:id/duplicate`
- `POST /api/v1/workflows/:id/validate`
- `POST /api/v1/workflows/:id/activate`
- `POST /api/v1/workflows/:id/deactivate`
- `POST /api/v1/workflows/:id/run`

### Credentials

- `GET|POST /api/v1/credentials`
- `GET|PATCH|DELETE /api/v1/credentials/:id` (GET = metadata only)
- `POST /api/v1/credentials/:id/test`
- `GET /api/v1/credential-types`

### Executions

- `GET /api/v1/executions`
- `GET /api/v1/executions/:id`
- `GET /api/v1/workflows/:id/executions`

### Public

- `POST|PUT|PATCH /hooks/:webhookPath`

---

## 14. Webhook lifecycle

1. Adding `trigger.webhook` allocates `webhookPath` (e.g. 32+ chars entropy) if missing.
2. Activate validates graph; sets `ACTIVE`, `lastActivatedAt`.
3. Request hits `/hooks/:path` → resolve workflow → reject if not ACTIVE → create Execution → run engine (or enqueue) → respond with `{ executionId, status }`.
4. Deactivate sets `INACTIVE`; path retained for reactivation.

---

## 15. Logging, redaction, observability

- Structured JSON logs: `level`, `msg`, `requestId`, `userId?`, `executionId?`.
- Redact keys matching `/authorization|api[_-]?key|token|secret|password|webhook/i`.
- Cap stored JSON blobs (e.g. 64 KB) with `__truncated: true`.
- Metrics (optional MVP): counters for runs succeeded/failed via logs.

---

## 16. Security threat model (condensed)

| Threat | Mitigation |
|--------|------------|
| Stolen JWT | Short TTL + refresh rotation |
| Credential dump | Encryption + no plaintext API |
| SSRF | SafeHttpClient deny private/metadata |
| Webhook spam | Rate limit + entropy path + size limit |
| IDOR | userId-scoped queries + tests |
| Graph injection | Zod + allowlisted node types |

---

## 17. Failure handling

- Node throw → catch → FAILED NodeExecution + FAILED Execution.
- External HTTP timeout → typed error code `HTTP_TIMEOUT`.
- Partial side effects (Slack sent, Airtable failed) are possible; document as MVP limitation (no distributed transactions).

---

## 18. Queue / worker evolution (Stretch 2)

```text
API: create Execution QUEUED → BullMQ.add(jobId=executionId)
Worker: claim → RUNNING → engine → terminal status
Feature flag: EXECUTION_MODE=inprocess|queue
```

Idempotency: unique job ID; status transitions check current state.

---

## 19. Design decisions and alternatives

| Decision | Chosen | Rejected | Why |
|----------|--------|----------|-----|
| API framework | Fastify | NestJS | Faster FYP velocity |
| Sheet connector | Airtable PAT | Google Sheets OAuth | Less auth complexity |
| Graph UI | React Flow | Custom canvas | Industry default |
| Queue in MVP | In-process | BullMQ day-1 | Fewer moving parts |
| Monorepo | pnpm + Turbo | Polyrepos | Shared types/engine |

---

## 20. Data retention and known limitations

- Demo retention ~30 days for executions on public deploy.
- No crash-resume for Mid-delay runs in MVP.
- Sequential branches only; no parallel fan-out wait.
- Expression language absent until Stretch 1 (configs are mostly static or simple field maps).

---

## Appendix A — Sequence: manual run

```text
UI → POST /workflows/:id/run
API → load workflow (user scoped)
API → validate snapshot
API → create Execution + NodeExecutions
API → engine.execute(...)
API → persist steps
API → return executionId
UI → GET /executions/:id
```

## Appendix B — Sequence: webhook run

```text
Ext → POST /hooks/:path
API → find ACTIVE workflow by path
API → create Execution (WEBHOOK)
API → engine.execute(trigger=body)
API → 200 { executionId, status }
```
