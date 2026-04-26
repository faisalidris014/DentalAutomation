# Requirements

> Synthesized from PRD §0–§13 and the SPECs (DentalFlow_Screen_Designs.md, DentalFlow_Screen_Hierarchy.md, docs/api-reference.md, docs/database.md). Each requirement is tagged with implementation status based on the DOCs (which describe what shipped). **IMPLEMENTED** = covered by a DOC describing committed code. **PENDING** = PRD scope not yet reflected in DOCs. **DRIFTED** = PRD shape and DOC reality diverge — see conflicts.

---

## REQ-AUTH-001 — JWT authentication with refresh rotation

- **Source:** PRD.md §8; docs/auth.md; docs/api-reference.md.
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - `POST /api/auth/login` returns `{ accessToken, refreshToken, user }` on valid email+password.
  - Access token JWT carries `{ sub, email, role, clinicId }`, expires in `JWT_EXPIRY` (default 15m).
  - Refresh tokens are SHA256-hashed at rest, single-use, expire in `REFRESH_TOKEN_EXPIRY_DAYS` days (default 7).
  - `POST /api/auth/refresh` rotates the pair; reuse of a rotated token returns 401.
  - `POST /api/auth/logout` revokes the refresh token.
  - Frontend stores tokens in module-scoped memory (never localStorage); 401 triggers automatic refresh+retry; refresh failure dispatches `auth:logout` event.

## REQ-AUTH-002 — Role-based access control with three roles

- **Source:** PRD.md §8; docs/auth.md (Role Permissions Matrix).
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - Roles: `it_admin`, `staff_admin`, `staff_user`.
  - `withAuth(allowedRoles, handler)` rejects unauthenticated callers with 401, unauthorized roles with 403.
  - `it_admin` may pass `clinic_id` to scope queries; `staff_admin`/`staff_user` always operate on their own `clinicId` regardless of input.
  - Staff admins cannot create `it_admin` users via `POST /api/users`.

## REQ-PMS-001 — PMS-agnostic adapter pattern

- **Source:** PRD.md §1 §3 §15; docs/adapters.md.
- **Status:** IMPLEMENTED for OpenDental.
- **Acceptance:**
  - Business logic depends only on `IPMSAdapter`. The interface lists `testConnection`, `getPatients`, `getPatientById`, `getAppointments`, `getInsurancePlans`, `getVerificationStatus`, `writeVerificationResult`, `getClaims`, `postInsurancePayment`, `parseWebhookPayload`.
  - `getAdapter(clinic)` reads `clinic.pmsType` + decrypted `clinic.pmsConfig` and returns the matching adapter; unknown types throw `PMSNotSupportedError`.
  - All adapters map to canonical models: `CanonicalPatient`, `CanonicalAppointment`, `CanonicalInsurancePlan`, `CanonicalVerificationStatus`, `CanonicalClaim`.

## REQ-PMS-002 — OpenDental on-premise connection support

- **Source:** PRD.md §0 §3 §15.1.
- **Status:** PARTIAL. OpenDental adapter and dual-key auth exist; `api_mode` flag drives rate limiting and pagination. Local agent / WebSocket tunnel is **not** documented as implemented.
- **Acceptance:**
  - HTTP client uses `Authorization: ODFHIR {DeveloperKey}/{CustomerKey}`.
  - `api_mode === 'remote'`: 5s read throttle, 1s write throttle, 100 items/page.
  - `api_mode === 'local' | 'service'`: no throttle, 1000 items/page.
  - Pilot connection mode uses Local API or API Service (on-premise), with eConnector → Remote as fallback.
  - **Pending:** lightweight Node.js local agent on the clinic LAN maintaining outbound WebSocket to cloud; webhook receipt + forwarding via the agent.

## REQ-PMS-003 — Dev mock mode for PMS writes

- **Source:** docs/adapters.md (Development Mock Mode).
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - Mock activates when `PMS_MOCK_MODE === 'true'` OR when `developer_key` or `customer_key` decrypts to `'placeholder'`.
  - `postInsurancePayment()` returns `{ success: true, pmsRecordId: 'MOCK-<timestamp>' }` and logs `[PMS-MOCK]`.
  - Read methods are **not** mocked.
  - Seed clinic ships with `placeholder` keys to enable mock out of the box.

## REQ-SYNC-001 — Patient/insurance/claims sync into local cache

- **Source:** PRD.md §1 §13; docs/architecture.md; docs/jobs.md.
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - `sync_patients`, `sync_insurance`, `sync_claims` job types pull data from PMS to `patients_cache` / `insurance_cache` / `claims_cache`.
  - Incremental sync uses `DateTStamp` (OpenDental) via `modifiedSince`.
  - PMS remains source of truth; cache is refreshed by sync engine.
  - `sync_appointments` is a stub — appointments are queried live (not cached).

## REQ-ELIG-001 — On-demand eligibility verification

- **Source:** PRD.md §5 §7; docs/eligibility.md; docs/api-reference.md.
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - `POST /api/eligibility/verify { patientId, insuranceId, clinicId? }` runs synchronously and returns the persisted `eligibility_checks` row.
  - Engine performs the 12 documented steps: load patient/insurance/clinic, classify payer, look up payer config, instantiate adapter, build request, execute, store result, update insurance cache, optional PMS write-back, optional notification.
  - Skips with `pmsWriteResult` of `skipped_unknown_payer` / `skipped_no_payer_config` / `skipped_payer_disabled` / `skipped_no_credentials` / `skipped_verification_failed` are first-class outcomes, not failures.
  - Inactive or unknown statuses generate notifications.

## REQ-ELIG-002 — Nightly batch eligibility verification

- **Source:** PRD.md §5; docs/eligibility.md (Batch Verification).
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - `eligibility_batch` job triggered by scheduler (default: 22:00 clinic local).
  - Reads `verification_threshold_days` setting (default 30) and queries insurance whose `lastVerifiedAt` is older than threshold or null.
  - Iterates through stale records, calling `verifyPatientEligibility` with `trigger: 'batch_nightly'`.
  - Writes verification result back to OpenDental via `PUT /insverifies` when credentials are real.
  - Produces a batch summary notification (`eligibility_batch_summary`).

## REQ-ELIG-003 — Day-of-service recheck

- **Source:** PRD.md §5; docs/eligibility.md (Day-of-Service Recheck).
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - `eligibility_recheck` job triggered at 6 AM clinic local.
  - Re-verifies insurance previously marked active.
  - Status changes to `inactive` create an urgent `eligibility_inactive` notification with `severity: 'error'`.

## REQ-ELIG-004 — Webhook-driven eligibility on appointment/insurance change

- **Source:** PRD.md §10; docs/eligibility.md (Webhook-Triggered Verification).
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - `POST /api/webhooks/opendental` validates `x-webhook-secret` header (or `?secret=`) against `WEBHOOK_SECRET` env.
  - Eligible events: `appointment.created`, `appointment.updated`, `patplan.created`, `patplan.updated`.
  - Creates a `webhook_process` job, returns 200 immediately, worker fans out to `eligibility_single` job calling `verifyPatientEligibility` with `trigger: 'webhook'`.

## REQ-ELIG-005 — Commercial benefits parsing via clearinghouse

- **Source:** PRD.md §4 §15.3 §15.4; docs/eligibility.md; docs/adapters.md.
- **Status:** IMPLEMENTED for the request shape and result envelope; concrete X12 270/271 parsing depends on the DentalXChange adapter body.
- **Acceptance:**
  - `EligibilityResult` carries `annualMaximum`, `annualMaximumUsed`, `deductible`, `deductibleMet`, `coveragePercentages` (preventive/basic/major/ortho), `copays[]`, `waitingPeriods[]`, `effectiveDate`, `terminationDate`, `dentalCoverageIncluded`.
  - Pilot commercial payers — Delta Dental, MetLife, Cigna — route to `clearinghouse.dentalxchange`.
  - Fallback search: subscriber_id first, then first_name + last_name + DOB (PRD §15.14).

## REQ-EOB-001 — EOB retrieval from payer adapters

- **Source:** PRD.md §6; docs/architecture.md; docs/api-reference.md (EOBs); docs/jobs.md.
- **Status:** IMPLEMENTED — but DentalXChange `retrieveEOBs` body is a deterministic mock 835 generator (per docs/adapters.md and README) that must be swapped for real DXC API calls before production. Phase 3.5 covers this swap (see REQ-EOB-005).
- **Acceptance:**
  - `POST /api/eob/sync { clinic_id }` creates an `eob_sync` job.
  - Adapters with `featuresEnabled.eob === true` and an implemented `retrieveEOBs(...)` are called.
  - Each `RawEOBDocument` (with `RawEOBLineItem[]`) is parsed, triaged, optionally posted, and persisted to `eob_records`.

## REQ-EOB-005 — Real clearinghouse EOB ingestion (Phase 3.5)

- **Source:** docs/adapters.md (DentalXChange EOB Support); README.md (Project Status); user decision during `/gsd-ingest-docs` 2026-04-26.
- **Status:** PENDING — hard prerequisite for the pilot. Mock 835 generator stays in dev mode; production must use a real source.
- **Acceptance:**
  - `retrieveEOBs(...)` issues real API calls to a chosen clearinghouse (DentalXChange first; fallbacks: Availity, pVerify, OpenDental EOB API per PRD §15.4).
  - 835 EDI parser ingests real payer payloads and emits the existing `RawEOBDocument` / `RawEOBLineItem[]` shape, so downstream parser/triage/posting/notification layers remain unchanged.
  - Adapter selection is configurable per clinic via `payer_configs` so the mock generator remains available for local/dev runs.
  - End-to-end smoke test: real EOB pulled → parsed → triaged → either auto-posted or flagged → notification raised, all on Muath's pilot data.
  - Production rollout gate: zero references to the deterministic mock generator in any production code path.

## REQ-EOB-002 — Six-rule auto-post triage

- **Source:** PRD.md §6; docs/architecture.md (Auto-Post Conditions).
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - All six rules must pass for `triage_status='auto_posted'`:
    1. Patient matched (exact `patientPmsId` or fuzzy first/last/DOB) in `patients_cache`.
    2. Claim matched in `claims_cache` (and `pmsClaimId` if EOB carried one).
    3. `paid > 0` unless a denial code is present.
    4. `paid <= settings.eob.auto_post_threshold` (default $250).
    5. No `denialCode`.
    6. `allowed <= fee`.
  - Any failure → `triage_status='flagged_for_review'`, `triage_reason` is deduplicated rule list joined with `;`, plus `eob_flagged` notification to `staff_admin` + `it_admin`.
  - **PRD-only variant — competing acceptance:** PRD §6 also includes “Duplicate EOB (same check_number already posted)” as a flag reason. DOC triage describes 6 rules with no duplicate-check rule. → see `INGEST-CONFLICTS.md` WARNING.

## REQ-EOB-003 — Manual review and post for flagged EOBs

- **Source:** PRD.md §7; docs/api-reference.md (EOBs).
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - `PUT /api/eob/:id/review { triage_status, review_notes }` for `staff_admin`+ updates the record after manual decision; only valid when current `triage_status === 'flagged_for_review'`.
  - `POST /api/eob/:id/post` posts an approved EOB to OpenDental via `postInsurancePayment` (creates ClaimPayment + ClaimProcs).
  - Already-posted or non-reviewable EOBs return 400.

## REQ-EOB-004 — Weekly EOB summary report

- **Source:** PRD.md §6; docs/architecture.md.
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - `eob_report` job (Active per docs/jobs.md) generates counts by triage status, total dollars posted, flagged items awaiting review.
  - Surfaced in the Dashboard / EOB screens.

## REQ-JOBS-001 — PostgreSQL-backed job queue

- **Source:** PRD.md §9; docs/jobs.md.
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - 12 job types defined in `server/services/queue/types.ts`: `sync_patients`, `sync_insurance`, `sync_appointments` (stub), `sync_claims`, `eligibility_batch`, `eligibility_single`, `eligibility_recheck`, `eob_sync`, `eob_post`, `eob_report`, `webhook_process`, `recall_reminder`.
  - Lifecycle: `queued → running → completed | failed | retrying | cancelled`.
  - Worker: `POST /api/internal/worker` authenticated by `Authorization: Bearer ${JWT_SECRET}`; processes one job per call; returns `{ processed: boolean }`.
  - Retries: exponential backoff `1000 * 60 * 2^retryCount` ms, default `maxRetries=3`.
  - Execution log: append-only JSONB array of `{ step, action, status, message, timestamp, durationMs?, data? }`.
  - Priority: integer (default 5), lower = higher; FIFO within same priority.

## REQ-JOBS-002 — Job management API

- **Source:** docs/jobs.md; docs/api-reference.md (Jobs).
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - `GET /api/jobs` with filters `status`, `job_type`, `clinic_id`, `limit`, `offset`.
  - `GET /api/jobs/:id` returns the row with execution_log; clinic-scoped for non-`it_admin`.
  - `POST /api/jobs/:id/cancel` and `POST /api/jobs/:id/retry` available to `it_admin` + `staff_admin`.

## REQ-AUDIT-001 — Audit log for every PHI access

- **Source:** PRD.md §8; docs/architecture.md.
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - Every authenticated API call is logged to `audit_log` with `user_id`, `clinic_id`, `action`, `entity_type`, `entity_id`, `details` (no raw PHI), `ip_address`, `user_agent`, `created_at`.
  - PRD requires retention for 6 years (HIPAA). Deployment guide currently only suggests archiving after 90 days — see conflicts WARNING #2.

## REQ-NOTIF-001 — Auto-generated platform notifications

- **Source:** PRD.md §10; docs/eligibility.md (Notifications).
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - Types include `eligibility_failed`, `eligibility_inactive`, `eligibility_batch_summary`, `eob_flagged`, `eob_zero_pay`, `claim_denied`, `sync_failed`, `agent_offline`, `system_alert`, `job_failed`.
  - Each notification carries `severity` (info/success/warning/error), `targetRoles`, `actionUrl` for deep linking.
  - `GET /api/notifications`, `PUT /api/notifications/:id`, `PUT /api/notifications/mark-all-read`.

## REQ-WEBHOOK-001 — OpenDental webhook receiver

- **Source:** PRD.md §10; docs/api-reference.md; docs/eligibility.md.
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - `POST /api/webhooks/opendental` is a public endpoint (no Bearer), authed by `WEBHOOK_SECRET`.
  - Payload requires `EventType` (string), `TableName` (string), `KeyNum`.
  - Always returns 200 (OpenDental retries up to 3 days on non-200).
  - Routes appointment/patplan changes to a `webhook_process` job.

## REQ-CLINIC-001 — Clinic CRUD with PMS health check

- **Source:** docs/api-reference.md (Clinics).
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - `GET /api/clinics`, `POST /api/clinics` (it_admin), `PUT /api/clinics/:id` (it_admin), `GET /api/clinics/:id`, `GET /api/clinics/:id/health` (it_admin + staff_admin).
  - `pms_config` is a JSONB record with at least `api_mode`, `base_url`, `developer_key`, `customer_key` for OpenDental.
  - Health endpoint calls `pmsAdapter.testConnection()` and returns `{ connected, error? }`.

## REQ-USER-001 — User CRUD with role guards

- **Source:** docs/api-reference.md (Users); docs/auth.md.
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - `GET /api/users`, `POST /api/users`, `PUT /api/users/:id` for `it_admin` + `staff_admin`.
  - Staff admins forced to their clinic on create; cannot grant `it_admin` role.
  - Password strength validated server-side (8+ chars, upper, lower, number).

## REQ-PATIENT-001 — Patient lookup & detail

- **Source:** docs/api-reference.md (Patients); DentalFlow_Screen_Designs.md.
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - `GET /api/patients` supports `search` (matches first/last/email, case-insensitive), `status`, `clinic_id`, pagination. Each row includes `primaryInsurance` (ordinal=1) or null.
  - `GET /api/patients/:id` returns patient with `insurance[]` and `recentClaims[]` (max 10), 404 outside clinic scope.

## REQ-DASHBOARD-001 — Role-specific dashboard KPIs

- **Source:** PRD.md §7 §11; DentalFlow_Screen_Designs.md (Screens 1, 1B, 1C); docs/api-reference.md.
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - `GET /api/dashboard/kpis` returns IT-Admin / Staff-Admin / Staff-User payload by inspecting JWT role.
  - IT Admin: clinic count, today's jobs, success rate, agent status, system alerts.
  - Staff Admin: today's production, MTD collections, overdue recalls, unverified insurance, today's schedule, automation activity, claim status chart.
  - Staff User: today's schedule, my jobs today, recent jobs, quick actions.

## REQ-RECALLS-001 — Derived recalls + reminder queueing

- **Source:** docs/api-reference.md (Recalls); docs/jobs.md.
- **Status:** IMPLEMENTED — **outside PRD scope** (PRD §0 explicitly excludes recall automation from this build). See WARNING #3.
- **Acceptance:**
  - `GET /api/recalls` derives recall candidates from `patients_cache.lastSyncedAt > 6 months`.
  - `POST /api/recalls { recallId? | patientId? }` queues a `recall_reminder` job.

## REQ-AGENTS-001 — Agent monitor for IT Admin

- **Source:** docs/api-reference.md (Agents); DentalFlow_Screen_Designs.md.
- **Status:** IMPLEMENTED — **outside PRD scope** for the on-prem agent (PRD describes a real local agent process; the API today aggregates clinic + PMS health into per-clinic “agent” entries). See WARNING #4.
- **Acceptance:**
  - `GET /api/agents` returns one entry per visible clinic with PMS connection status, queue stats, version (placeholder).
  - `status === 'online'` iff `testConnection()` succeeds.
  - Logs array currently empty (future).

## REQ-SETTINGS-001 — Clinic + system settings with payer configs

- **Source:** PRD.md §2 §7; docs/api-reference.md (Settings); docs/database.md (settings, payer_configs).
- **Status:** IMPLEMENTED.
- **Acceptance:**
  - `GET /api/settings?category=&clinic_id=` merges system-wide + clinic-specific (clinic-specific wins).
  - `PUT /api/settings { category, key, value, clinicId? }` upserts (it_admin + staff_admin).
  - `GET /api/settings/payer-configs` excludes credentials.
  - `PUT /api/settings/payer-configs/:id` re-encrypts credentials at rest before storage.

## REQ-UI-001 — 10 screens, 3 roles, dark glassmorphic theme

- **Source:** DentalFlow_Screen_Hierarchy.md; DentalFlow_Screen_Designs.md; PRD.md §11 §15.9.
- **Status:** IMPLEMENTED (existing prototype wired to real APIs).
- **Acceptance:**
  - Routes: `/dashboard`, `/patients`, `/patients/:id`, `/eligibility`, `/recalls`, `/claims`, `/eob`, `/automations`, `/automations/:id`, `/agents`, `/notifications`, `/settings`, `/login`.
  - Role-gated visibility per the matrix in DentalFlow_Screen_Hierarchy.md.
  - Design system: dark navy (#0b0f1a / #1a2235 / #243049), cyan #22d3ee accent, DM Sans + Space Mono, styled-jsx (no Tailwind).
  - Frontend uses `lib/api.ts` (real API client) — no `mockApi.ts` references remain.

## REQ-HIPAA-001 — HIPAA-from-day-one operational baseline

- **Source:** PRD.md §8 §15.
- **Status:** PARTIAL — most controls implemented; some operational items pending hosting decision.
- **Acceptance:**
  - Encryption in transit: HTTPS only (TLS 1.2+).
  - Encryption at rest: PostgreSQL with encrypted storage; AES-256-GCM for payer credentials.
  - Audit log retained per HIPAA (PRD says 6y; deployment guide currently 90d archive — RESOLVE).
  - PHI scrubbing in error handler.
  - JWT 15m, refresh rotation, no shared accounts.
  - Bcrypt rounds ≥ 12.
  - **Pending:** signed BAAs with **Vercel** and **Neon** (hosting locked per D-014).

## REQ-PILOT-001 — Muath's Minnesota clinic pilot scope

- **Source:** PRD.md §0 (Pilot Client).
- **Status:** PENDING — dev environment seeded with a different clinic ("Bright Smiles Dental", Austin, TX). The pilot identity in the PRD is not reflected in seed/setup, but seed is dev-only. See INFO #4.
- **Acceptance:**
  - Pilot deployment connects to Muath's on-premise OpenDental in Minnesota.
  - Top payers: Delta Dental, MetLife, Cigna (commercial only — no Medicaid for the pilot).
  - Connection: VPN tunnel OR local agent on clinic LAN bridging to cloud.
  - Pricing: ~$400/month pilot, with a target of $3,000/month for future clients.
