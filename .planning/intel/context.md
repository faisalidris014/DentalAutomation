# Context

> Narrative context, scope, goals/non-goals, and open questions, synthesized from PRD.md, README.md, SHOWCASE-SCRIPT.md, docs/setup.md, docs/deployment.md, and Screen Hierarchy/Designs.

---

## Project Identity

**DentalFlow** by NiftyByte LLC. Dental practice automation platform. The repository is `DentalAutomation` on GitHub; product surface name is DentalFlow. Built on Next.js 16.2 (App Router), React 19, TypeScript 5 strict, PostgreSQL + Drizzle ORM, JWT auth, styled-jsx UI with a dark glassmorphic theme (cyan #22d3ee on navy #0b0f1a/#1a2235/#243049, DM Sans + Space Mono).

The platform connects to dental Practice Management Systems (PMS) and insurance payers through extensible adapter patterns. OpenDental is the first PMS integration; DentalXChange is the first commercial-eligibility clearinghouse adapter.

---

## Why This Exists (the business problem)

Dental front-desk and billing staff spend significant manual effort on two repetitive workflows:

1. **Insurance eligibility verification** — calling carriers or logging into payer portals to confirm coverage and benefits (annual max, deductible, coverage %, copays, waiting periods) for upcoming appointments. Mistakes cost the clinic real money in unbilled procedures or surprise patient balances.
2. **EOB (Explanation of Benefits) posting** — receiving payer remits, matching line items to patients and claims in the PMS, and posting payments. Most are routine; exceptions (denials, zero-pays, mismatches) need a human.

DentalFlow automates the routine 90–95% and surfaces the exceptions. Pilot target: cover the cost of compute (~$400/month) for a Minnesota OpenDental clinic; price future clients at ~$3,000/month.

---

## Phases (per PRD §13 and DOCs)

| Phase | Scope | Status (per docs) |
|-------|-------|-------------------|
| Phase 1 | Auth, patient/insurance sync, eligibility verification (batch + on-demand + webhook), job queue, notifications, audit logging | **Complete** |
| Phase 2 | Eligibility automation hardening, claims sync, appointment sync, advanced reporting | **Complete** |
| Phase 3 | EOB retrieval, parser, 6-rule triage engine, auto-post, manual review, weekly reports | **Complete (with mock 835 generator pending production swap)** |
| Phase 4 | Front-end wiring (replace mockApi, login page, role from JWT) | **Complete** |

Recent commits (`713efa9`, `7db2a11`, `083b892`, `7dbd8c1`, `1d41aaa`) corroborate phases 1–4 are landed. The repo has uncommitted edits in `docs/adapters.md` and `server/adapters/pms/opendental/adapter.ts`.

Phase 1–4 represent **shipped reality**. Anything below covers either (a) PRD scope that exceeds shipped reality, or (b) DOC reality that exceeds the original PRD scope.

---

## Goals (in scope)

- Connect to dental PMS via a clean adapter interface so future PMS support (EagleSoft, SoftDent, Dentrix, Curve) is purely additive.
- Automate insurance eligibility verification end-to-end for the pilot's commercial payers (Delta Dental, MetLife, Cigna), including full benefits parsing.
- Automate EOB retrieval, triage (auto-post 90%+, flag exceptions), and posting back to OpenDental.
- HIPAA compliance from day one: encryption at rest + in transit, audit logging, PHI scrubbing, RBAC, BAA-covered hosting.
- Replace all front-end mock data with real backend wiring; keep the existing prototype's design system intact.
- Multi-tenant by clinic, with `it_admin` cross-clinic, `staff_admin` clinic-scoped, `staff_user` clinic-scoped read-heavy.

---

## Non-Goals (per PRD §0 — "What NOT to Build")

The PRD explicitly excludes:

- AI receptionist / phone agent (separate product, later).
- Claims submission automation (deferred).
- Recall management automation (deferred).
- Native mobile app.
- Multi-tenant SaaS infrastructure (the PRD defines this build as "single-tenant per deployment").
- Payment processing through OpenDental (requires $35 OD tier).

**Drift since PRD:** The shipped DOCs describe `recalls` endpoints, `recall_reminder` jobs, an Agents API for IT Admin, and multi-tenancy as a feature. These represent post-PRD scope additions and need explicit reconciliation before the roadmap is rewritten — see `INGEST-CONFLICTS.md` WARNING #3, WARNING #4.

---

## Pilot Client

- **Clinic:** Muath's clinic, Minnesota.
- **PMS:** OpenDental on-premise (NOT OpenDental Cloud).
- **Connection mode:** Local API or API Service mode preferred (no rate limit, 1000 items/page). Requires VPN tunnel from the cloud or a lightweight local agent on the clinic LAN. Remote mode via eConnector is the documented fallback.
- **Top payers:** Delta Dental (#1), MetLife, Cigna — all commercial. No Medicaid for this pilot.
- **Pricing target:** ~$400/month for the pilot, $3,000/month for future clients.

The seed clinic in `docs/setup.md` is "Bright Smiles Dental" (Austin, TX) — that is dev seed data, not the pilot identity. Pilot config has not been provisioned in `.planning/` yet.

---

## Architecture Overview

```
Browser (React 19, styled-jsx, dark glassmorphic theme)
  └─ Next.js App Router (app/)
       ├─ Pages (app/(app)/) — 11 role-gated routes
       ├─ API Routes (app/api/) — 27+ REST endpoints
       │    └─ Middleware chain:
       │         withErrorHandler → withAuth → withAudit → withValidation → handler
       │    └─ Server services (server/services/):
       │         Auth (JWT, sessions, passwords)
       │         Eligibility (engine, batch, recheck, classifier)
       │         Sync (patients, insurance, claims, differ)
       │         EOB (parser, triage, engine, reporter)
       │         Queue (manager, worker)
       │         Notifications
       │         Encryption (AES-256-GCM)
       │    └─ Adapters (server/adapters/):
       │         PMS — OpenDental (client, adapter, mappers, webhooks, types)
       │         Payer — DentalXChange (clearinghouse)
       │    └─ Database — PostgreSQL via Drizzle ORM
       │         13 tables (server/db/schema.ts)
       └─ Webhooks (app/api/webhooks/) — OpenDental event receiver
```

Key invariant: **business logic NEVER calls a PMS or payer API directly**. Everything goes through the adapter interfaces.

---

## Major Decisions (see `decisions.md` for the full list)

- **D-001/D-002/D-003** — Drizzle on Postgres, JWT+refresh, three roles (locked by all sources).
- **D-007** — Database-backed job queue (no Redis dependency for pilot).
- **D-008/D-009** — PMS-agnostic + payer-agnostic adapter patterns.
- **D-014** — **HOSTING IS UNRESOLVED.** PRD says Azure (App Service / Postgres / Key Vault / Monitor) leveraging the existing Microsoft BAA. DOCs (deployment.md) describe Vercel + Neon/Supabase. This is a hard prerequisite for any production deployment and the highest-priority conflict in `INGEST-CONFLICTS.md`.

---

## Active Open Questions

1. **Hosting target.** Vercel (DOC) or Azure (PRD)? Drives BAA, secrets management, cron pattern, and runtime location.
2. **Audit log retention.** PRD requires 6 years (HIPAA). Deployment guide says "consider archiving after 90 days." Pick the policy and implement it.
3. **Production EOB adapter.** Today's DentalXChange `retrieveEOBs` is a deterministic mock 835 generator suitable for the demo. Production needs real DXC API integration and real 835 EDI parsing. The PRD also mentions Availity, pVerify, and an open GitHub API as candidates.
4. **Local agent component.** The PRD describes a Node.js local agent that maintains an outbound WebSocket from the clinic LAN to cloud. Today's `/api/agents` endpoint synthesizes "agent status" from clinic + PMS health — there is no actual agent process. Decide whether to build the real local agent or stay with VPN-only.
5. **Worker auth on Vercel Cron.** Currently `Authorization: Bearer ${JWT_SECRET}`. Vercel Cron passes `CRON_SECRET` automatically. Deployment guide flags this as a follow-up — confirm before production.
6. **Pilot identity in `.planning/`.** Replace dev seed values with a documented production-pilot config for Muath's clinic before deploy.
7. **Scope drift since PRD.** Recalls + Agents APIs exist despite being out-of-scope per PRD §0. Either expand the PRD's scope to make them official, or document them as "demo-only" until reconciled.
8. **Duplicate EOB rule.** PRD §6 lists "duplicate EOB (same check_number already posted)" as a flag reason; DOC triage describes 6 rules without it. Decide if rule #7 needs to ship.

---

## Tech Stack (per shipped DOCs)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2 (App Router) |
| UI | React 19, styled-jsx |
| Language | TypeScript 5 (strict) |
| Database | PostgreSQL + Drizzle ORM 0.45 |
| Auth | JWT via `jose` (HS256), `bcryptjs` |
| Validation | Zod 4 |
| Icons | Lucide React |
| Charts | Chart.js + react-chartjs-2 |
| Fonts | DM Sans (UI), Space Mono (data) |
| Hosting (DOC) | Vercel + Neon or Supabase |
| Hosting (PRD) | Azure App Service / Container Apps + Azure Database for PostgreSQL + Key Vault |

---

## Roles

| Role | Scope | Key capabilities |
|------|-------|-----------------|
| **IT Admin** | All clinics | System-wide management, agents, clinic setup, payer configuration, push agent updates |
| **Staff Admin** | Own clinic | Insurance workflows, claims, EOB review, staff management, settings |
| **Staff User** | Own clinic | Eligibility checks, recalls, claims tracking, notifications (filtered) |

---

## Screens (10 implemented, role-gated)

`/dashboard`, `/patients`, `/patients/:id`, `/eligibility`, `/recalls`, `/claims`, `/eob`, `/automations`, `/automations/:id`, `/agents`, `/notifications`, `/settings`, plus `/login`. Visibility per role is the canonical matrix in `DentalFlow_Screen_Hierarchy.md`. The dashboard renders three different layouts driven by JWT role, not by a UI dropdown — the prototype's "RoleSwitcher" was removed in Phase 4.

---

## What an Implementer Should Read First

1. `decisions.md` — start with D-014 (hosting) and any locked items.
2. `requirements.md` — REQ-AUTH-*, REQ-PMS-*, REQ-ELIG-*, REQ-EOB-* are the load-bearing flows.
3. `constraints.md` — C-001 to C-004 (API contract), C-005 to C-009 (schema), C-010/C-011 (adapter contracts), C-012/C-013 (OpenDental protocol).
4. `INGEST-CONFLICTS.md` — RESOLVE the WARNINGS before any production scope is locked.
