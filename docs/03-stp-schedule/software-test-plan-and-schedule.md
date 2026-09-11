# Software Test Plan and Project Schedule (STP + SPMP)

**Project:** FlowForge  
**Document ID:** FF-STP-001  
**Version:** 1.0  
**Status:** Baseline  
**Date:** 2026-09-11  
**Traces to:** FF-SRS-001, FF-SDD-001

---

## 1. Purpose and objectives

Prove that FlowForge MVP meets numbered SRS requirements, is safe with secrets, and is demonstrable on Docker Compose and a public Railway/Render URL. This document also holds the **20-week schedule** and **viva demo script**.

---

## 2. Scope and exclusions

**In scope:** Unit, integration, API, E2E, security smoke, deploy smoke, golden workflows.  
**Excluded from formal pass/fail:** Load testing at production scale, full WCAG audit, multi-browser matrix beyond Chromium Playwright.

---

## 3. Test levels

| Level | Focus | Owner | Tools |
|-------|-------|-------|-------|
| Unit | Engine, crypto, redaction, node validators | Dev | Vitest |
| Integration | Auth, CRUD, webhooks, DB | Dev | Fastify inject, Testcontainers Postgres |
| Contract/mock | Slack/Discord/Airtable/HTTP | Dev | MockAgent / local mock server |
| E2E | Editor + run + history UI | Dev | Playwright |
| Security smoke | SSRF, IDOR, secret leakage | Dev | Targeted suites |
| Manual / demo | Viva script | Team | Checklist |

---

## 4. Test environments

| Env | Stack | Data |
|-----|-------|------|
| Local unit | No DB | Fixtures |
| Local integration | Compose Postgres | Migrations + factories |
| CI | GitHub Actions + service containers | Ephemeral |
| Staging | Railway/Render | Seed demo user + workflow |
| Demo fallback | Full Compose on laptop | Seed + recording |

---

## 5. Tools and quality gates (CI)

1. Lint + format check  
2. Typecheck  
3. Unit tests  
4. Integration tests (Postgres)  
5. Build all packages  
6. Playwright smoke (Compose or preview)  
7. `pnpm audit` / secret scan  

**Engine coverage gate:** ≥ 85% lines and branches on `packages/engine`.

---

## 6. Entry and exit criteria

**Feature coding entry:** SRS/SDD/STP v1.0 approved; monorepo scaffold green.  
**MVP exit (Week 16):** All Must REQs mapped to passing tests; Golden Flows 1–4 green locally; docs synced.  
**Deploy exit (Week 17):** Public URL + evidence pack.  
**Final exit (Week 20):** Stretches demoable or explicitly deferred with rationale; viva rehearsal done.

---

## 7. Traceability matrix (REQ → tests)

| REQ ID | Test IDs | Level |
|--------|----------|-------|
| AUTH-001…005 | T-AUTH-01…05 | Integration |
| WF-001…006 | T-WF-01…06 | Integration + E2E |
| EDITOR-001…005 | T-ED-01…05 | E2E |
| NODE-001…010 | T-NODE-01…10 | Unit (+ mock integration for connectors) |
| NODE-011 | T-NODE-11 | Unit (stretch) |
| CRED-001…005 | T-CRED-01…05 | Unit + Integration |
| EXEC-001…006 | T-EXEC-01…06 | Unit + Integration |
| EXEC-007 | T-EXEC-07 | Integration (stretch) |
| WEBHOOK-001…005 | T-WH-01…05 | Integration |
| SEC-001…003 | T-SEC-01…03 | Unit + Integration |
| OPS-001…004 | T-OPS-01…04 | Integration + Manual |
| NFR-001…002 | T-NFR-01…02 | Performance smoke |

---

## 8. Unit test plan

| Test ID | Description | Pass criteria |
|---------|-------------|---------------|
| T-NODE-01 | Manual trigger emits payload | Output matches input context |
| T-NODE-04 | IF/Else branch selection | Correct `branch`; opposite skipped |
| T-NODE-05 | Set/Transform field ops | Expected JSON shape |
| T-EXEC-02 | Topological order + fail-fast | Downstream skipped on failure |
| T-EXEC-cycle | Cycle detection | Invalid graph rejected |
| T-CRED-02 | AES-GCM roundtrip + tamper | Decrypt fails on modified ciphertext |
| T-SEC-redact | Redaction utility | Secret keys masked |
| T-SEC-01 | SSRF denylist | Private/metadata hosts rejected |
| T-NODE-11 | Expression resolver | Paths resolve; no `eval` |

---

## 9. Integration test plan

| Test ID | Description |
|---------|-------------|
| T-AUTH-01 | Register → login → me |
| T-AUTH-02 | Duplicate email 409 |
| T-AUTH-05 | User A cannot GET User B workflow |
| T-WF-02 | Save and reload graph JSON |
| T-WF-05 | Activate invalid graph fails; valid succeeds |
| T-WF-06 | Stale revision rejected |
| T-WH-02 | Inactive webhook rejected |
| T-WH-03 | Oversized body 413 |
| T-EXEC-01 | Manual run persists steps |
| T-EXEC-04 | Snapshot survives later graph edit |
| T-CRED-03 | GET credential has no plaintext |
| T-OPS-01 | `/health` 200; `/ready` reflects DB |

---

## 10. API contract notes

- Validate status codes and error `code` fields for auth and validation failures.
- Webhook success response must include `executionId`.

---

## 11. End-to-end test plan (Playwright)

| Test ID | Flow |
|---------|------|
| T-ED-01 | Login → create workflow → add 2 nodes → connect → save → reload |
| T-ED-03 | Open node → edit config → save → verify persistence |
| T-GF-01 | Run Golden Flow 1; assert branch log in UI |
| T-GF-03 | Activate Golden Flow 3; POST webhook; assert execution SUCCEEDED |

---

## 12. Security and abuse tests

- IDOR suite (AUTH-005 / T-AUTH-05)  
- Secret markers in responses/logs (CRED-003)  
- SSRF probe hosts (SEC-001)  
- Webhook rate limit smoke (WEBHOOK-005)  
- Missing env secrets → process refuses to start (SEC-003)

---

## 13. Performance smoke

| Test ID | Scenario | Target |
|---------|----------|--------|
| T-NFR-01 | Validate 100-node DAG | ≤ 500 ms |
| T-NFR-02 | Manual run start to first node | ≤ 1 s local (no external I/O) |

Document concurrent webhook smoke results; do not claim production SLA.

---

## 14. Compatibility / accessibility

Chromium Playwright only for CI. Manual check: keyboard focus on login and primary editor actions; labeled form fields.

---

## 15. Golden workflow scenarios

### Golden Flow 1 — Core branching (`T-GF-01`)

```text
Manual Trigger → Set priority=high → IF priority==high
  true  → Log "urgent"
  false → Delay → Log "normal"
```

**Expect:** true branch runs; false SKIPPED; execution SUCCEEDED.

### Golden Flow 2 — HTTP enrichment (`T-GF-02`)

```text
Manual → Set id → HTTP GET (mock) → IF status==200 → Log
```

**Expect:** Mapped body fields; mock 500 → FAILED + downstream SKIPPED (also covers GF-4 pattern).

### Golden Flow 3 — Lead intake (`T-GF-03`)

```text
Webhook → IF email exists → Airtable create → Slack
                        └ false → Discord
```

**Expect:** Active accepts POST; record + Slack (or mocks); inactive rejects.

### Golden Flow 4 — Expected failure (`T-GF-04`)

```text
Manual → HTTP 500 (mock) → Log
```

**Expect:** FAILED; Log SKIPPED; no secret leakage in error payload.

---

## 16. Defect severity

| Severity | Definition | SLA (project) |
|----------|------------|---------------|
| S1 | Demo blocker / secret leak | Fix before any release tag |
| S2 | MVP REQ broken | Fix before Week 16 freeze |
| S3 | Stretch / UX polish | Best effort |
| S4 | Cosmetic | Backlog |

---

## 17. Test evidence format

For each milestone: CI run URL or local log, list of passed Test IDs, screenshots for E2E, redaction proof note. Store under `docs/03-stp-schedule/evidence/` when available (Week 17+).

---

## 18. Week-by-week schedule (Gantt)

| Week | Phase | Deliverables | Gate |
|-----:|-------|--------------|------|
| 1 | Requirements | SRS draft, wireframes, risk register | Scope freeze |
| 2 | Architecture + scaffold | SRS 1.0, monorepo, CI skeleton | Build green |
| 3 | Data + STP | SDD/STP 1.0, Prisma migration, factories | Docs unlock coding |
| 4 | Auth | Register/login/refresh/logout | Secure empty dashboard |
| 5 | Workflow CRUD | API + dashboard list/create | Drafts persist |
| 6 | Editor foundation | React Flow palette/save | Visual graph save |
| 7 | Engine contracts | Registry, Zod, cycles, topo | Engine unit green |
| 8 | Core nodes | Manual, Set, IF, Log, Delay | **GF-1** |
| 9 | Execution UI | List + detail + redaction | Auditable runs |
| 10 | Webhooks | Paths, activate, curl run | External trigger works |
| 11 | Credentials | AES store + UI + test | Encrypted secrets |
| 12 | HTTP/Slack/Discord | Connectors + mocks | **GF-2** |
| 13 | Airtable | Create record + docs | **GF-3** |
| 14 | Editor hardening | Validation UX, a11y basics | Unassisted build |
| 15 | Security/reliability | SSRF, rate limits, headers | Security checklist |
| 16 | MVP freeze | Tag RC; sync docs | MVP complete |
| 17 | Deploy + formal STP | Railway URL; evidence | Public demo |
| 18 | Stretch 1 | Expressions | Dynamic mappings |
| 19 | Stretch 2 | BullMQ worker | Split processes |
| 20 | Submission | Final docs, rehearsal, recording | Viva ready |

**Contingency:** Weeks 16–17 absorb spillover; drop Stretch 2 before Stretch 1 if behind.

### Milestone checkpoints (supervisor)

| Week | Checkpoint |
|-----:|------------|
| 4 | Auth + empty dashboard |
| 7 | Canvas demo |
| 10 | First E2E run from UI |
| 14 | Webhook + one real connector |
| 17 | Deployed URL + test report |

---

## 19. Milestones and dependencies

```text
Docs v1 → Scaffold → Auth → Workflows → Editor
                              ↘ Engine → Core nodes → Exec UI
                                         ↘ Webhooks → Creds → Connectors
                                                              ↘ Harden → Deploy
                                                                         ↘ Stretches
```

---

## 20. Demo acceptance checklist (10–12 minutes)

1. [ ] State problem + MVP boundary + architecture slide  
2. [ ] Login  
3. [ ] Build or open lead-intake workflow  
4. [ ] Show validation blocking a deliberate error  
5. [ ] Show credentials metadata (no secrets)  
6. [ ] Activate; copy webhook URL  
7. [ ] POST sample JSON; show Airtable + Slack (or mocks + recording)  
8. [ ] Open execution detail; walk IF branch  
9. [ ] Show failed-run diagnostics  
10. [ ] (If ready) Expression + worker enqueue  
11. [ ] Show CI green + traceability excerpt  
12. [ ] State limitations / future work  

**Fallback:** Seeded flow + Compose + pre-recorded external side effects.

---

## 21. Risks and contingency

| Risk | Impact | Mitigation | Contingency time |
|------|--------|------------|------------------|
| Scope creep (more connectors) | High | Freeze 10 node types Week 2 | — |
| Engine semantics ambiguity | High | SDD branch/fail-fast rules before code | Week 7 buffer |
| Secret leakage | Critical | Central redaction + tests | Block release |
| OAuth complexity | High | Airtable PAT not Sheets | — |
| Hosting free-tier sleep | Medium | Local Compose + recording | Week 17 |
| Connector outage on viva day | High | Mocks + screenshots | Demo fallback |
| Behind schedule | High | Cut Stretch 2 first | Weeks 18–19 |

---

## 22. Definition of Done (feature)

- Code in monorepo with types  
- Unit/integration tests for REQ IDs touched  
- No plaintext secrets in fixtures committed  
- Docs updated if schema/API/behavior changed  
- CI green on branch  

---

## Appendix A — Sample webhook payload (GF-3)

```json
{
  "email": "lead@example.com",
  "name": "Alex Lead",
  "source": "viva-demo"
}
```

## Appendix B — Local commands (target)

```bash
pnpm install
docker compose up -d postgres
pnpm --filter db migrate
pnpm --filter db seed
pnpm dev
pnpm test
pnpm --filter web exec playwright test
```
