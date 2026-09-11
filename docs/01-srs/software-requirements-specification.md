# Software Requirements Specification (SRS)

**Project:** FlowForge  
**Document ID:** FF-SRS-001  
**Version:** 1.0  
**Status:** Baseline  
**Date:** 2026-09-11  

---

## 1. Document control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-09-11 | Project team | Initial baseline — unlocks implementation |

**Related documents:** SDD (`docs/02-sdd/`), STP + Schedule (`docs/03-stp-schedule/`)

---

## 2. Purpose

This SRS defines the functional and non-functional requirements for **FlowForge**, a self-hostable visual workflow automation platform inspired by n8n and Activepieces. It is the contract for MVP scope, acceptance criteria, and verification for a final-year project (16–20 weeks).

---

## 3. Scope

### 3.1 In scope (MVP)

- User authentication (email/password, JWT sessions)
- Visual workflow editor (drag-and-drop DAG)
- Workflow CRUD, activate/deactivate
- Execution engine with per-node history
- Triggers: Manual, Webhook
- Core nodes: HTTP Request, IF/Else, Set/Transform, Delay, Log/Debug
- Connectors: Slack (incoming webhook), Discord (webhook), Airtable (create record)
- Encrypted credential storage
- Local Docker Compose and public Railway/Render deployment

### 3.2 Out of scope

- Multi-tenant SaaS billing / SSO / LDAP
- Google Sheets OAuth and other OAuth2 connectors
- Cron/schedule trigger (listed as future work)
- Arbitrary sandboxed code execution / plugin marketplace
- Parallel merge synchronization, durable crash-resume checkpoints
- Kubernetes HA, multi-region, auto-scaling policies
- 50+ prebuilt integrations

### 3.3 Stretch (post-MVP, weeks 18–19)

- **S1:** Safe expression interpolation (`{{trigger.body.email}}`) without `eval`
- **S2:** BullMQ worker process split with in-process fallback flag

---

## 4. Definitions and abbreviations

| Term | Definition |
|------|------------|
| **Workflow / Flow** | A named DAG of nodes and edges stored as JSON |
| **Node** | A single step (trigger, logic, or connector) |
| **Edge** | Directed connection between nodes; may use named handles (e.g. `true`/`false`) |
| **Execution** | One run of a workflow with status and step logs |
| **Credential** | Encrypted secret used by connectors at runtime |
| **DAG** | Directed Acyclic Graph |
| **MVP** | Minimum Viable Product for viva demonstration |
| **REQ** | Numbered requirement ID |

---

## 5. Product perspective

FlowForge sits between end-user applications (Slack, Discord, Airtable, arbitrary HTTP APIs) and human builders who configure integrations visually.

```text
[Builder UI] ←→ [API + Engine] ←→ [Postgres]
                      ↓
              [External APIs / Webhooks]
```

Users author flows in the browser; the backend validates, stores, and executes them. External systems invoke active webhook URLs.

---

## 6. User classes and personas

| Persona | Goals | Skills |
|---------|-------|--------|
| **Builder** (primary) | Automate lead intake, notifications, and data sync without writing glue services | Comfortable with APIs, webhooks, JSON |
| **Demo operator** (viva) | Run a rehearsed end-to-end scenario reliably | Follows script; uses prepared credentials |

MVP is **single-tenant per deployment** (many users on one instance, each owning only their resources). No org/RBAC roles beyond ownership.

---

## 7. Assumptions and constraints

1. Builders have valid API tokens / incoming webhooks for Slack, Discord, and Airtable.
2. Deployment provides HTTPS for public webhooks (Railway/Render).
3. Team has Node.js 20+, Docker, and pnpm available.
4. Semester length supports ~16–20 weeks of part-time development.
5. Airtable Personal Access Token is preferred over Google Sheets to avoid OAuth complexity.
6. Engine runs **in-process** in the API for MVP; worker is stretch only.
7. Delay node maximum is **60 seconds** in MVP.

---

## 8. Use cases

### UC-01 — Register and sign in

**Actor:** Builder  
**Precondition:** None  
**Main flow:** Register with email/password → receive session → land on dashboard.  
**Postcondition:** Authenticated session; user row exists.  
**Exceptions:** Duplicate email → 409; invalid credentials → 401.

### UC-02 — Build and save a workflow

**Actor:** Builder  
**Main flow:** Create workflow → drag nodes → connect edges → configure → save.  
**Postcondition:** Graph persisted; reload restores positions and config.

### UC-03 — Manual test run

**Actor:** Builder  
**Precondition:** Valid saved graph with Manual Trigger  
**Main flow:** Click Run → engine executes → view per-node I/O.  
**Postcondition:** Execution and NodeExecution rows created.

### UC-04 — Activate webhook and receive event

**Actor:** Builder + External system  
**Precondition:** Graph with Webhook Trigger; credentials valid  
**Main flow:** Activate → copy URL → external POST JSON → flow runs → side effects (Airtable/Slack).  
**Exceptions:** Inactive flow → reject; invalid graph → activation blocked.

### UC-05 — Inspect failed execution

**Actor:** Builder  
**Main flow:** Open failed run → identify failing node → read safe error → fix config → re-run.  
**Postcondition:** No plaintext secrets visible in UI or logs.

---

## 9. Functional requirements

Priority: **M** = Must (MVP), **S** = Stretch, **F** = Future.

### 9.1 Authentication (`AUTH-*`)

| ID | Priority | Requirement | Acceptance criteria | Verification |
|----|----------|-------------|---------------------|--------------|
| AUTH-001 | M | Users can register with email and password | Unique email; password hashed (Argon2id); 409 on duplicate | Integration |
| AUTH-002 | M | Users can log in and receive a session | Short-lived JWT access + HttpOnly refresh cookie | Integration |
| AUTH-003 | M | Users can refresh and log out | Refresh rotates/revokes; logout invalidates refresh | Integration |
| AUTH-004 | M | All non-public routes require auth | Unauthenticated → 401 | Integration |
| AUTH-005 | M | Users only access own resources | Cross-user IDs → 404/403 | Integration |

### 9.2 Workflows (`WF-*`)

| ID | Priority | Requirement | Acceptance criteria | Verification |
|----|----------|-------------|---------------------|--------------|
| WF-001 | M | Create, list, get, rename, delete workflows | CRUD works; delete confirms in UI | API + E2E |
| WF-002 | M | Save graph JSON with version | Reload preserves nodes/edges/config/positions | API + E2E |
| WF-003 | M | Duplicate workflow | New inactive copy; new webhook path if applicable | Integration |
| WF-004 | M | Validate graph server-side | Zod + DAG rules; field-level errors | Unit + API |
| WF-005 | M | Activate / deactivate | Active only if validation passes; deactivate stops webhooks | Integration |
| WF-006 | M | Optimistic concurrency on save | Stale `updatedAt`/revision rejected | Integration |

### 9.3 Visual editor (`EDITOR-*`)

| ID | Priority | Requirement | Acceptance criteria | Verification |
|----|----------|-------------|---------------------|--------------|
| EDITOR-001 | M | Drag nodes from palette onto canvas | All MVP node types available | E2E |
| EDITOR-002 | M | Connect handles; delete nodes/edges | Connections persist on save | E2E |
| EDITOR-003 | M | Configure selected node in sidebar | Config bound to node; validation shown | E2E |
| EDITOR-004 | M | Dirty-state indicator | Unsaved changes flagged before navigate | E2E |
| EDITOR-005 | M | Show validation issues | Cycles, missing trigger, bad config surfaced | E2E |

### 9.4 Nodes (`NODE-*`)

| ID | Priority | Requirement | Acceptance criteria | Verification |
|----|----------|-------------|---------------------|--------------|
| NODE-001 | M | Manual Trigger | Starts run from UI/API | Unit + E2E |
| NODE-002 | M | Webhook Trigger | Unique path; JSON body as trigger data | Integration |
| NODE-003 | M | HTTP Request | Methods GET/POST/PUT/PATCH/DELETE; timeout; status/body out | Unit + Integration |
| NODE-004 | M | IF/Else | Comparison ops; exactly one branch taken | Unit |
| NODE-005 | M | Set/Transform | Map/set/remove fields | Unit |
| NODE-006 | M | Delay | Wait ≤ 60s; AbortSignal respected | Unit |
| NODE-007 | M | Log/Debug | Records redacted value in step logs | Unit |
| NODE-008 | M | Slack Message | Posts via incoming webhook credential | Integration (mock) |
| NODE-009 | M | Discord Message | Posts via webhook credential | Integration (mock) |
| NODE-010 | M | Airtable Create Record | PAT + base/table + field map creates row | Integration (mock) |
| NODE-011 | S | Expression interpolation | `{{paths}}` resolved safely without eval | Unit |

### 9.5 Credentials (`CRED-*`)

| ID | Priority | Requirement | Acceptance criteria | Verification |
|----|----------|-------------|---------------------|--------------|
| CRED-001 | M | CRUD credentials | Types: Slack, Discord, Airtable, generic API key | API + E2E |
| CRED-002 | M | Encrypt at rest AES-256-GCM | IV + authTag; master key from env | Unit |
| CRED-003 | M | Never return plaintext secrets | API/UI/logs/flow JSON show refs only | Integration |
| CRED-004 | M | Test credential | Endpoint verifies connectivity where possible | Integration |
| CRED-005 | M | Block unsafe delete | Referenced credentials require confirm + deactivate dependents | Integration |

### 9.6 Execution (`EXEC-*`)

| ID | Priority | Requirement | Acceptance criteria | Verification |
|----|----------|-------------|---------------------|--------------|
| EXEC-001 | M | Manual run API | Creates Execution; returns ID | Integration |
| EXEC-002 | M | Deterministic DAG traversal | Topological order; fail-fast | Unit |
| EXEC-003 | M | Persist NodeExecution rows | Status, I/O (capped), duration, errors | Integration |
| EXEC-004 | M | Snapshot workflow graph at run start | History accurate after later edits | Integration |
| EXEC-005 | M | List/filter executions | By workflow, status, trigger type | API |
| EXEC-006 | M | Redact secrets in stored payloads | Known markers stripped | Unit |
| EXEC-007 | S | Queue to BullMQ worker | Job ID = execution ID; idempotent | Integration |

### 9.7 Webhooks (`WEBHOOK-*`)

| ID | Priority | Requirement | Acceptance criteria | Verification |
|----|----------|-------------|---------------------|--------------|
| WEBHOOK-001 | M | Unique high-entropy path per webhook flow | DB unique constraint | Integration |
| WEBHOOK-002 | M | Only ACTIVE flows execute | Inactive → 4xx | Integration |
| WEBHOOK-003 | M | Accept JSON; enforce size limits | Oversized → 413 | Integration |
| WEBHOOK-004 | M | Return execution ID | Response includes run reference | Integration |
| WEBHOOK-005 | M | Rate limit public hooks | Burst abuse mitigated | Integration |

### 9.8 Security & ops (`SEC-*`, `OPS-*`)

| ID | Priority | Requirement | Acceptance criteria | Verification |
|----|----------|-------------|---------------------|--------------|
| SEC-001 | M | SSRF protection on HTTP node | Block private/metadata IPs in hosted mode | Unit |
| SEC-002 | M | Security headers + CORS | Restricted to frontend origin | Integration |
| SEC-003 | M | Startup fails if encryption/JWT secrets missing | Clear error on boot | Integration |
| OPS-001 | M | Health and readiness endpoints | `/health`, `/ready` | Integration |
| OPS-002 | M | Structured logs without secrets | Redaction applied | Manual + unit |
| OPS-003 | M | Docker Compose one-command start | Documented in README | Manual |
| OPS-004 | M | Seed demo workflow command | Reproducible viva data | Manual |

---

## 10. Non-functional requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-001 | Graph validation latency | ≤ 500 ms for ≤ 100-node acyclic graph (dev hardware) |
| NFR-002 | Manual run start latency | ≤ 1 s to first node (excluding external API time), local in-process |
| NFR-003 | Payload caps | Configurable max body (e.g. 1 MB webhook); truncated stored I/O with marker |
| NFR-004 | Availability (demo) | Public staging URL reachable for viva; local Compose fallback |
| NFR-005 | Maintainability | Engine package independent of Fastify/React; typed node registry |
| NFR-006 | Testability | Engine ≥ 85% line/branch coverage; golden E2E flows automated |
| NFR-007 | Portability | Docker images run on Compose and Railway/Render without code forks |

---

## 11. External interface requirements

### 11.1 User interfaces

- Web SPA: auth, dashboard, editor, credentials, execution detail
- Responsive enough for laptop demo; mobile polish not required

### 11.2 APIs

- Authenticated REST under `/api/v1/*`
- Public webhooks under `/hooks/:webhookPath`
- JSON request/response; standard error envelope `{ code, message, details? }`

### 11.3 External systems

- Slack Incoming Webhooks
- Discord Webhooks
- Airtable REST API (PAT)
- Arbitrary HTTPS endpoints via HTTP Request node

---

## 12. Data requirements

Persist: users, refresh tokens, workflows (JSONB graph), credentials (ciphertext), executions, node executions, audit events.  
Retention for public demo: executions retained ~30 days (configurable).  
No PII beyond email and user-provided workflow payloads.

---

## 13. Security and privacy requirements

1. Passwords: Argon2id; never logged.
2. Credentials: AES-256-GCM; decrypt only in execution/test paths.
3. Webhooks: unguessable paths; optional shared-secret header (if implemented).
4. Authorization: all repository queries scoped by `userId`.
5. HTTP node: DNS/IP policy against SSRF.
6. Secrets only via environment variables; `.env` never committed.

---

## 14. Acceptance criteria (MVP gate — Week 16)

- [ ] All **M** requirements have ≥1 automated or documented manual test mapped in STP
- [ ] Golden Flow 3 runs on deployed URL (or local Compose with recording)
- [ ] No plaintext credentials in API responses, DB plaintext columns, or logs during test suite
- [ ] SRS/SDD/STP updated to match implemented behavior
- [ ] `docker compose up --build` brings up a working stack from clean machine

---

## 15. Out-of-scope / future work

Cron triggers, OAuth connectors, Loop/Merge nodes, sub-workflows, real-time SSE run UI, multi-org RBAC, AI agent nodes, npm plugin SDK, durable checkpoint resume.

---

## 16. Requirement traceability (summary)

Full matrix lives in STP. Mapping prefixes:

| REQ prefix | Primary test areas |
|------------|-------------------|
| AUTH-* | API auth suite |
| WF-*, EDITOR-* | API + Playwright editor |
| NODE-*, EXEC-* | Engine unit + execution API |
| CRED-*, SEC-* | Crypto unit + redaction + SSRF |
| WEBHOOK-*, OPS-* | Webhook integration + health |

---

## Appendix A — Demo killer scenario

1. Builder activates: Webhook → IF email present → Airtable create → Slack notify; else Discord warn.  
2. Audience POSTs JSON from phone/Postman.  
3. Airtable row + Slack message appear; execution detail shows branch choice.
