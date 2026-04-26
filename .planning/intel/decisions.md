# Decisions

> Synthesized from PRD §14 (Technical Decisions) and DOC reality (architecture.md, deployment.md, auth.md, jobs.md, adapters.md). No ADR-class documents exist in the ingest set, so nothing here is `locked`. Decisions marked **IMPLEMENTED** are reflected in committed code per the docs; decisions marked **PRD-ONLY** are aspirational and may conflict with what shipped — see `INGEST-CONFLICTS.md`.

---

## D-001 — ORM is Drizzle on PostgreSQL

- **Status:** IMPLEMENTED
- **Decision:** Use Drizzle ORM 0.45 against PostgreSQL 15+. UUID primary keys. UTC timestamps. JSONB for flexible payloads.
- **Rationale:** Type-safe, lightweight, strong migration tooling, pairs with TypeScript strict mode. HIPAA-compatible at rest.
- **Sources:** PRD.md §14; docs/database.md; docs/architecture.md; docs/setup.md.

## D-002 — Auth is JWT (HS256) + rotating refresh tokens

- **Status:** IMPLEMENTED
- **Decision:** Access tokens are JWTs signed via `jose` HS256. Default expiry 15m. Refresh tokens are UUIDs stored as SHA256 hashes in `refresh_tokens` table, single-use, default 7-day expiry. Reuse of a rotated token is rejected.
- **Rationale:** Stateless API, simple RBAC, no session server. One-time-use refresh tokens give revocation primitives.
- **Sources:** PRD.md §8; docs/auth.md; docs/api-reference.md (Auth section).

## D-003 — RBAC has three roles: it_admin, staff_admin, staff_user

- **Status:** IMPLEMENTED
- **Decision:** `it_admin` has cross-clinic access; `staff_admin` and `staff_user` are pinned to their `clinicId` regardless of any `clinic_id` query parameter. Permission matrix is the canonical source in `docs/auth.md`.
- **Rationale:** Multi-tenant boundary, prevents cross-clinic PHI access.
- **Sources:** PRD.md §8; docs/auth.md; docs/api-reference.md (Roles).

## D-004 — Multi-tenant boundary is the `clinics` table

- **Status:** IMPLEMENTED
- **Decision:** Every domain table carries a `clinic_id` FK. `getClinicScope(user, requestedClinicId)` enforces filtering at every read path. `it_admin` may pass `clinic_id`; non-`it_admin` users have it ignored.
- **Sources:** docs/architecture.md (Multi-Tenancy Model); docs/auth.md (Clinic Scope); docs/database.md.

## D-005 — Password hashing is bcrypt with min 12 rounds

- **Status:** IMPLEMENTED
- **Decision:** `bcryptjs`, configurable via `BCRYPT_ROUNDS` env var (default 12, min 10, max 15). Strength validator requires 8+ chars, upper, lower, number.
- **Sources:** PRD.md §8 §15; docs/auth.md.

## D-006 — Credential encryption is AES-256-GCM at rest

- **Status:** IMPLEMENTED
- **Decision:** Payer/PMS credentials encrypted via `server/services/encryption/credentials.ts` using AES-256-GCM. Key from `CREDENTIAL_ENCRYPTION_KEY` env (min 32 hex chars).
- **Sources:** PRD.md §14; docs/architecture.md; docs/deployment.md; docs/adapters.md.

## D-007 — Job queue is database-backed (no Redis)

- **Status:** IMPLEMENTED
- **Decision:** Jobs live in the `jobs` table. Worker is invoked via `POST /api/internal/worker` (one job per call). Dequeue order: `priority ASC, created_at ASC`. Retries use exponential backoff `1000 * 60 * 2^retryCount` ms with default `maxRetries=3`.
- **Rationale:** Simple, no Redis dep for pilot; can migrate to BullMQ later.
- **Sources:** PRD.md §9 §14; docs/jobs.md; docs/architecture.md.

## D-008 — PMS-agnostic adapter pattern; OpenDental is first impl

- **Status:** IMPLEMENTED
- **Decision:** Business logic only ever calls `IPMSAdapter`. Concrete adapter for OpenDental lives at `server/adapters/pms/opendental/`. Registry resolves by `clinic.pmsType`. Future PMS support is additive — no business-logic changes.
- **Sources:** PRD.md §1 §3 §15; docs/adapters.md (PMS section); docs/architecture.md.

## D-009 — Payer-agnostic adapter pattern; clearinghouse-first eligibility

- **Status:** IMPLEMENTED (DentalXChange adapter wired; EOB body is a mock 835 generator pending production swap)
- **Decision:** All eligibility goes through `IPayerAdapter`. Pilot's commercial payers (Delta Dental, MetLife, Cigna, Aetna, UHC, Guardian, Humana, Principal, Ameritas, SunLife) route to `clearinghouse.dentalxchange`. Medicaid carriers route to `medicaid.minnesota` (planned). Unknown carriers route to `manual_review`.
- **Sources:** PRD.md §4 §15; docs/eligibility.md (Payer Classification); docs/adapters.md.

## D-010 — Validation is Zod at the request boundary

- **Status:** IMPLEMENTED
- **Decision:** Every mutating endpoint runs through `withValidation(zodSchema)`. Validation failures return 400 with `fieldErrors`.
- **Sources:** PRD.md §14; docs/api-reference.md (Error Codes); docs/architecture.md (Middleware Chain).

## D-011 — Middleware chain order

- **Status:** IMPLEMENTED
- **Decision:** `withErrorHandler → withAuth → withAudit → withValidation → handler`. PHI is scrubbed in the error handler before any log emit.
- **Sources:** docs/architecture.md (Middleware Chain); docs/auth.md.

## D-012 — Worker invocation auth is `Bearer ${JWT_SECRET}` (raw secret)

- **Status:** IMPLEMENTED
- **Decision:** `POST /api/internal/worker` authenticates by comparing the bearer token to the raw `JWT_SECRET` value, not to a user JWT. Vercel Cron passes `CRON_SECRET` automatically; deployment guide flags this as a follow-up to switch to `CRON_SECRET`.
- **Sources:** docs/jobs.md (Worker Invocation); docs/auth.md (Role Permissions Matrix); docs/deployment.md (Worker section).

## D-013 — Webhook auth is shared-secret header (`x-webhook-secret`)

- **Status:** IMPLEMENTED (deviates from PRD wording — see conflicts INFO #2)
- **Decision:** `POST /api/webhooks/opendental` is verified against `WEBHOOK_SECRET` env var via `x-webhook-secret` header or `?secret=` query parameter. If `WEBHOOK_SECRET` is unset, requests are accepted with a server-side warning (acceptable in development; required in production).
- **Sources:** docs/api-reference.md (Webhooks); docs/eligibility.md (Webhook-Triggered Verification); docs/deployment.md.

## D-014 — Hosting target is Vercel + Neon (LOCKED)

- **Status:** LOCKED (resolved 2026-04-26 by user during ingest; supersedes PRD §14 §15.15 Azure language).
- **Decision:** Production runs on **Vercel** (Next.js app + serverless functions + Vercel Cron) with **Neon** as the managed PostgreSQL provider. Vercel BAA + Neon BAA together replace the previously-cited Microsoft BAA chain.
- **Implications:**
  - Cron uses `vercel.json` schedule → `POST /api/internal/worker` (already wired).
  - Secrets live in Vercel project env vars (no Azure Key Vault). `CREDENTIAL_ENCRYPTION_KEY` rotated through Vercel env management.
  - Audit/runtime logs use Vercel Observability + Neon logs (no Azure Monitor).
  - Worker invocation should migrate from `Bearer ${JWT_SECRET}` to validating Vercel's auto-injected `CRON_SECRET` (see D-012 follow-up; tracked in roadmap).
  - PRD.md §14 + §15.15 must be amended in the next docs phase to reflect Vercel + Neon.
- **Sources:** docs/deployment.md (canonical); user decision during `/gsd-ingest-docs` 2026-04-26.

## D-015 — Mock mode for OpenDental writes

- **Status:** IMPLEMENTED
- **Decision:** `OpenDentalAdapter.postInsurancePayment()` short-circuits to a successful `MOCK-<timestamp>` response when `PMS_MOCK_MODE === 'true'` OR when `developer_key`/`customer_key` decrypts to the literal string `'placeholder'`. Read methods always hit real API. Production credentials never decrypt to `placeholder`.
- **Rationale:** Lets the EOB auto-post pipeline run end-to-end on a freshly seeded dev DB without OpenDental write access.
- **Sources:** docs/adapters.md (Development Mock Mode).

## D-016 — EOB auto-post requires all 6 triage rules to pass

- **Status:** IMPLEMENTED
- **Decision:** A line item auto-posts only when (1) patient matched, (2) claim matched, (3) `paid > 0` unless denied, (4) `paid <= settings.eob.auto_post_threshold` (default $250), (5) no denial code, (6) `allowed <= fee`. Any failure flags the EOB with deduplicated reasons and creates an `eob_flagged` notification for `staff_admin` + `it_admin`.
- **Sources:** PRD.md §6; docs/architecture.md (Auto-Post Conditions); docs/api-reference.md (EOBs).

## D-017 — Audit log scope: every PHI touch

- **Status:** IMPLEMENTED
- **Decision:** `withAudit` middleware logs user, action, entity_type, entity_id, IP, user_agent, timestamp to `audit_log` for every authenticated request. PHI never appears in `details`. Retention default not set; deployment guide suggests archiving after 90d. PRD §8 requires 6-year retention for HIPAA.
- **Sources:** PRD.md §8; docs/architecture.md; docs/deployment.md; docs/database.md.

## D-018 — Three-tier eligibility triggers

- **Status:** IMPLEMENTED
- **Decision:** Verification is triggered by (1) nightly batch, (2) day-of-service recheck at 6 AM, (3) on-demand from UI, (4) webhook (appointment.created/updated, patplan.created/updated). Each trigger persists an `eligibility_checks` row and a `jobs` row where applicable.
- **Sources:** PRD.md §5; docs/eligibility.md.
