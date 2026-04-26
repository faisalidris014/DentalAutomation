# DentalFlow

## What This Is

DentalFlow is a dental practice automation platform built by NiftyByte LLC that connects to dental Practice Management Systems (PMS) and insurance payers through extensible adapter patterns. It automates the two highest-volume manual workflows for dental front-desk and billing staff — insurance eligibility verification and EOB (Explanation of Benefits) posting — while surfacing exceptions to humans. The product surface name is DentalFlow; the GitHub repo is `DentalAutomation`.

The pilot target is Muath's clinic in Minnesota running on real on-premise OpenDental and real DentalXChange EOB ingestion. The current state is a working prototype wired to real APIs across all pages, with Phases 1–4 (auth, sync, eligibility, EOB engine, frontend) shipped against a deterministic mock 835 generator suitable for the Ilyas demo.

## Core Value

Automate the routine 90–95% of insurance eligibility verification and EOB posting end-to-end against real on-prem OpenDental — and surface only the exceptions to clinic staff. If everything else fails, this single loop must work for Muath's clinic on real DentalXChange data.

## Success Metrics

- **Demo (near-term):** Ilyas presentation runs through `SHOWCASE-SCRIPT.md` end-to-end on the wired prototype.
- **Pilot (production):** Muath's Minnesota clinic running on real on-prem OpenDental + real DentalXChange EOB ingestion, auto-posting to OpenDental working end-to-end.
- **Pricing:** ~$400/month covers compute for the pilot; ~$3,000/month per future client.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. Phases 1-4 already in main. -->

- ✓ **REQ-AUTH-001** JWT authentication with refresh rotation — Phase 1
- ✓ **REQ-AUTH-002** Three-role RBAC (it_admin / staff_admin / staff_user) — Phase 1
- ✓ **REQ-PMS-001** PMS-agnostic adapter pattern — Phase 2
- ✓ **REQ-PMS-003** Dev mock mode for PMS writes — Phase 2
- ✓ **REQ-SYNC-001** Patient/insurance/claims sync into local cache — Phase 2
- ✓ **REQ-ELIG-001** On-demand eligibility verification — Phase 2
- ✓ **REQ-ELIG-002** Nightly batch eligibility verification — Phase 2
- ✓ **REQ-ELIG-003** Day-of-service recheck — Phase 2
- ✓ **REQ-ELIG-004** Webhook-driven eligibility on appointment/insurance change — Phase 2
- ✓ **REQ-ELIG-005** Commercial benefits parsing via clearinghouse — Phase 2
- ✓ **REQ-EOB-001** EOB retrieval from payer adapters (mock 835 in dev) — Phase 3
- ✓ **REQ-EOB-002** Six-rule auto-post triage — Phase 3
- ✓ **REQ-EOB-003** Manual review and post for flagged EOBs — Phase 3
- ✓ **REQ-EOB-004** Weekly EOB summary report — Phase 3
- ✓ **REQ-JOBS-001** PostgreSQL-backed job queue — Phase 1
- ✓ **REQ-JOBS-002** Job management API — Phase 1
- ✓ **REQ-AUDIT-001** Audit log for every PHI access (retention enforcement pending) — Phase 1
- ✓ **REQ-NOTIF-001** Auto-generated platform notifications — Phase 1
- ✓ **REQ-WEBHOOK-001** OpenDental webhook receiver — Phase 2
- ✓ **REQ-CLINIC-001** Clinic CRUD with PMS health check — Phase 1
- ✓ **REQ-USER-001** User CRUD with role guards — Phase 1
- ✓ **REQ-PATIENT-001** Patient lookup & detail — Phase 2
- ✓ **REQ-DASHBOARD-001** Role-specific dashboard KPIs — Phase 4
- ✓ **REQ-SETTINGS-001** Clinic + system settings with payer configs — Phase 1
- ✓ **REQ-UI-001** 10 screens, 3 roles, dark glassmorphic theme — Phase 4

### Active

<!-- Current scope. Building toward these for the Muath pilot. -->

- [ ] **REQ-EOB-005** Real clearinghouse EOB ingestion — Phase 3.5 (hard prerequisite for pilot)
- [ ] **REQ-PMS-002** OpenDental on-premise connectivity for Muath's clinic (local agent / VPN tunnel) — Phase 7
- [ ] **REQ-RECALLS-001** Derived recalls + reminder queueing — Phase 5 (scope reconciliation)
- [ ] **REQ-AGENTS-001** Agent monitor for IT Admin — Phase 5 (scope reconciliation)
- [ ] **REQ-HIPAA-001** HIPAA-from-day-one operational baseline (6yr audit retention, key rotation, BAAs) — Phase 6
- [ ] **REQ-PILOT-001** Muath's Minnesota clinic pilot scope — Phase 7

### Out of Scope (current build)

| Feature | Reason |
|---------|--------|
| AI receptionist / phone agent | Separate product; PRD §0 explicit exclusion |
| Claims submission automation | Deferred to a later milestone (PRD §0) |
| Native mobile app | Web-first; mobile later if pilot validates |
| Payment processing through OpenDental | Requires $35 OD tier; not in pilot scope |
| Minnesota Medicaid adapter | Pilot is commercial-only (Delta Dental, MetLife, Cigna) |
| Multi-tenant SaaS infrastructure beyond clinic-scoping | PRD framed as "single-tenant per deployment"; clinic-scoping shipped, broader SaaS deferred |

## Context

**Tech stack (production target):**
- Runtime: Node.js 20+
- Framework: Next.js 16 (App Router) — note: this is NOT the Next.js most training data describes; consult `node_modules/next/dist/docs/` before making framework-shaped decisions
- UI: React 19, styled-jsx (no Tailwind), DM Sans + Space Mono, dark glassmorphic theme on cyan #22d3ee + navy #0b0f1a/#1a2235/#243049
- Language: TypeScript 5 strict
- Database: Neon PostgreSQL via Drizzle ORM 0.45
- Hosting: Vercel (Next.js + serverless + Vercel Cron)
- Auth: JWT (HS256) via `jose`, bcryptjs (≥12 rounds), AES-256-GCM for credentials
- Validation: Zod 4

**Repo state at ingest (2026-04-26):** Phases 1–4 shipped on `main`. Recent commits: `1d41aaa` (auth/eligibility/route groups/API integration), `7dbd8c1` (replace mocks with real APIs), `083b892` (Phase 3 EOB engine + parser + triage + reporter), `7db2a11` (EOB UI + auth proxy), `713efa9` (Phase 3 docs). Working tree has uncommitted edits in `docs/adapters.md` and `server/adapters/pms/opendental/adapter.ts`.

**Pilot client:** Muath's clinic, Minnesota. PMS: OpenDental on-premise (NOT OpenDental Cloud). Connection mode: Local API or API Service preferred; VPN tunnel or local agent on clinic LAN required. Top payers: Delta Dental (#1), MetLife, Cigna. Dev seed clinic ("Bright Smiles Dental", Austin TX) is dev-only and is not the pilot identity.

**Architecture invariant:** business logic NEVER calls a PMS or payer API directly — everything routes through `IPMSAdapter` and `IPayerAdapter`. Middleware chain: `withErrorHandler → withAuth → withAudit → withValidation → handler`.

**EOB production gap:** DentalXChange `retrieveEOBs` is currently a deterministic mock 835 generator. It must be swapped for a real clearinghouse integration before pilot deploy (REQ-EOB-005 / Phase 3.5). The mock must remain available for dev/local runs.

## Constraints

- **Tech stack:** Next.js 16 App Router on Vercel, Neon PostgreSQL, Drizzle ORM, styled-jsx only (no Tailwind, no other CSS frameworks). UI must preserve the dark glassmorphic theme exactly.
- **Compliance:** HIPAA from day one. Encryption in transit (TLS 1.2+), at rest (Neon encrypted storage, AES-256-GCM for credentials). Audit log retained 6 years (PRD §8). PHI scrubbed from URLs, logs, and error messages. BAAs required with Vercel and Neon before production.
- **API contract:** Every list response is `{ data, total, limit, offset }`. Errors use `{ error, code, fieldErrors? }` with the canonical 400/401/403/404/409/500 codes. All non-public endpoints take `Authorization: Bearer ${accessToken}`.
- **Multi-tenant boundary:** `clinics` table. Every domain table FKs to `clinics.id`. `staff_admin` and `staff_user` cannot escape their `clinicId` regardless of query params; cross-clinic access returns 404, not 403.
- **OpenDental protocol:** `Authorization: ODFHIR {DeveloperKey}/{CustomerKey}`. Remote mode: 5s read / 1s write throttle, 100/page. Local/Service mode: no throttle, 1000/page.
- **Worker model:** `POST /api/internal/worker` processes one job per call. External scheduler (Vercel Cron at `*/1 * * * *`) sets throughput. Auth must migrate from `Bearer ${JWT_SECRET}` to Vercel-injected `CRON_SECRET` before pilot.
- **Webhook contract:** `/api/webhooks/opendental` validates `x-webhook-secret`, persists a `webhook_process` job, returns 200 immediately. No inline downstream work.
- **No locked-vs-locked contradictions** in ingested intel; all source-consensus decisions stand.

## Key Decisions

<!-- Locked decisions promoted from `.planning/intel/decisions.md`. All D-### entries with Status IMPLEMENTED or LOCKED are treated as locked here. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| **D-001** ORM is Drizzle on PostgreSQL (UUID PKs, UTC, JSONB) | Type-safe, lightweight, strong migrations, HIPAA-compatible at rest | ✓ Good (shipped Phases 1–3) |
| **D-002** Auth is JWT (HS256 via `jose`) + rotating refresh tokens (SHA256 hashed, single-use, 7d) | Stateless API, simple RBAC, revocation primitives | ✓ Good (shipped Phase 1) |
| **D-003** RBAC has three roles: `it_admin`, `staff_admin`, `staff_user` | Multi-tenant boundary, prevents cross-clinic PHI access | ✓ Good (shipped Phase 1) |
| **D-004** Multi-tenant boundary is the `clinics` table; enforced via `getClinicScope` | Every read path filters by clinic; non-it_admin cannot escape `clinicId` | ✓ Good (shipped Phase 1) |
| **D-005** Password hashing is bcrypt with min 12 rounds | HIPAA-grade strength, configurable | ✓ Good (shipped Phase 1) |
| **D-006** Credential encryption is AES-256-GCM at rest (32-byte key from env) | PMS/payer credentials never plaintext on disk | ✓ Good (shipped Phase 1) |
| **D-007** Job queue is database-backed (no Redis) | Simple, no extra dep for pilot; can migrate to BullMQ later | ✓ Good (shipped Phase 1) |
| **D-008** PMS-agnostic adapter pattern; OpenDental is first impl | Future PMS support is purely additive; business logic depends only on `IPMSAdapter` | ✓ Good (shipped Phase 2) |
| **D-009** Payer-agnostic adapter pattern; clearinghouse-first eligibility | DentalXChange first; Medicaid + others additive | ✓ Good for eligibility; ⚠️ EOB body still a mock generator (Phase 3.5 swap) |
| **D-010** Validation is Zod at the request boundary via `withValidation` | Fail fast at the edge, surface field errors | ✓ Good (shipped Phase 1) |
| **D-011** Middleware chain: `withErrorHandler → withAuth → withAudit → withValidation → handler` | PHI scrubbed in error handler before any log emit | ✓ Good (shipped Phase 1) |
| **D-012** Worker invocation auth is `Bearer ${JWT_SECRET}` (raw secret) | Simplest pre-prod auth; migrates to Vercel `CRON_SECRET` for pilot | ⚠️ Revisit in Phase 7 (Vercel `CRON_SECRET` migration) |
| **D-013** Webhook auth is shared-secret header (`x-webhook-secret`) | Deviates from PRD prose; matches OpenDental webhook capability | ✓ Good (shipped Phase 2) |
| **D-014** Hosting target is Vercel + Neon — **LOCKED 2026-04-26** | Resolved during ingest. Supersedes PRD §14 §15.15 Azure language. Vercel BAA + Neon BAA replace the Microsoft BAA chain. | — Pending pilot rollout (Phase 7); docs update to remove Azure prose tracked in Phase 5 |
| **D-015** Mock mode for OpenDental writes (`PMS_MOCK_MODE` or `placeholder` keys) | Lets EOB auto-post pipeline run end-to-end on dev DB without real OpenDental | ✓ Good (shipped Phase 3) |
| **D-016** EOB auto-post requires all 6 triage rules to pass | Patient match, claim match, paid > 0 unless denied, paid ≤ threshold, no denial code, allowed ≤ fee | ⚠️ Revisit: PRD §6 lists 7 rules (duplicate-check missing); decision in Phase 5 |
| **D-017** Audit log scope: every PHI touch via `withAudit` middleware | User, action, entity, IP, UA logged; PHI never in `details` | ⚠️ Revisit: 6yr retention enforcement pending (Phase 6) |
| **D-018** Three-tier eligibility triggers (nightly batch, day-of-service recheck, on-demand, webhook) | Covers proactive + reactive verification | ✓ Good (shipped Phase 2) |

---
*Last updated: 2026-04-26 after `/gsd-ingest-docs` synthesized 14 documents (PRD + 4 SPECs + 9 DOCs) into `.planning/intel/`.*
