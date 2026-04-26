# Constraints

> Non-functional and contract constraints synthesized from the SPECs (api-reference.md, database.md, screen designs/hierarchy) and PRD. SPEC-class items take precedence over PRD prose where they describe shipped contracts.

---

## C-001 — API contract — auth header and base path

- **Type:** api-contract
- **Source:** docs/api-reference.md (Overview / Authentication).
- **Constraint:**
  - Base URL: `http://localhost:3000/api` (dev) / `${APP_URL}/api` (prod).
  - All non-public endpoints require `Authorization: Bearer ${accessToken}`.
  - Public endpoints: `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout`.
  - Secret-based endpoints: `POST /api/webhooks/opendental` (`x-webhook-secret` or `?secret=`), `POST /api/internal/worker` (`Authorization: Bearer ${JWT_SECRET}`).
  - All bodies are `application/json`.

## C-002 — API contract — error envelope and codes

- **Type:** api-contract
- **Source:** docs/api-reference.md (Error Responses).
- **Constraint:**
  - Error body: `{ error: string, code: string, fieldErrors?: { [field]: string[] } }`.
  - Codes: `VALIDATION_ERROR (400)`, `AUTHENTICATION_ERROR (401)`, `AUTHORIZATION_ERROR (403)`, `NOT_FOUND (404)`, `CONFLICT (409)`, `INTERNAL_ERROR (500)`.
  - PHI (SSN, phone, email, DOB, insurance IDs) auto-redacted from server logs by `errorHandler` middleware.

## C-003 — API contract — list pagination

- **Type:** api-contract
- **Source:** docs/api-reference.md (Pagination).
- **Constraint:**
  - List response shape: `{ data: T[], total: number, limit: number, offset: number }`.
  - `limit`: default 50, max 100. `offset`: default 0.
  - Common query params accepted by most list endpoints: `clinic_id`, `search`, `status`, `limit`, `offset`, `date_from`, `date_to`.

## C-004 — API contract — clinic scoping rule

- **Type:** api-contract
- **Source:** docs/auth.md (Clinic Scope); docs/api-reference.md.
- **Constraint:**
  - `it_admin`: `clinic_id` query param is honored; if omitted, returns cross-clinic results.
  - `staff_admin` / `staff_user`: `clinic_id` query param is **ignored**; results are forced to the caller's `clinicId`.

## C-005 — Database schema — 13 tables, UUID PKs, timestamps UTC

- **Type:** schema
- **Source:** docs/database.md; PRD.md §2.
- **Constraint:**
  - Tables: `clinics`, `users`, `refresh_tokens`, `patients_cache`, `insurance_cache`, `eligibility_checks`, `eob_records`, `claims_cache`, `jobs`, `notifications`, `audit_log`, `payer_configs`, `settings`.
  - All PKs are `uuid` with `defaultRandom()`.
  - All timestamps stored in UTC.
  - Multi-tenancy: nearly every domain table FKs to `clinics.id`; `users.clinic_id` is nullable for `it_admin`.

## C-006 — Database schema — unique constraint on patient cache

- **Type:** schema
- **Source:** docs/database.md (patients_cache).
- **Constraint:** `idx_patient_clinic_pms` — UNIQUE on (`clinic_id`, `pms_patient_id`). Prevents duplicate cache rows for the same PMS patient inside a clinic.

## C-007 — Database schema — refresh_tokens cascade and indexes

- **Type:** schema
- **Source:** docs/database.md (refresh_tokens).
- **Constraint:**
  - `user_id` FK to `users.id` with cascade delete.
  - Stored as SHA256 hash, never plaintext.
  - Indexes: `idx_refresh_token_hash` on `token_hash`, `idx_refresh_token_user` on `user_id`.

## C-008 — Database schema — eligibility_checks index

- **Type:** schema
- **Source:** docs/database.md.
- **Constraint:** `idx_eligibility_clinic_patient` on (`clinic_id`, `patient_id`, `created_at`) for the eligibility history list view.

## C-009 — Database schema — settings unique constraint

- **Type:** schema
- **Source:** docs/database.md (settings); PRD.md §2.
- **Constraint:** `idx_settings_clinic_cat_key` UNIQUE on (`clinic_id`, `category`, `key`). System-wide settings use `clinic_id = null`; clinic-specific values override.

## C-010 — Adapter contract — IPMSAdapter

- **Type:** api-contract
- **Source:** docs/adapters.md; PRD.md §3.
- **Constraint:** Every PMS adapter must implement: `pmsType: string`, `testConnection`, `getPatients`, `getPatientById`, `getAppointments`, `getInsurancePlans`, `getVerificationStatus`, `writeVerificationResult`, `getClaims`, `postInsurancePayment`, `parseWebhookPayload`. Reads return `SyncResult<T>`; writes return `WriteResult`. Read methods may throw `PMSConnectionError`; write methods catch and surface via `{ success: false, error }`.

## C-011 — Adapter contract — IPayerAdapter

- **Type:** api-contract
- **Source:** docs/adapters.md; PRD.md §4.
- **Constraint:** Properties: `payerName: string`, `payerType: 'medicaid' | 'commercial'`, optional `supportedStates: string[]`. Methods: `testConnection`, `checkEligibility(EligibilityRequest) → EligibilityResult`, `getHealthStatus`, optional `retrieveEOBs({ dateFrom, dateTo, clinicNpi }) → RawEOBDocument[]`. Adapters without `retrieveEOBs` are skipped during EOB sync.

## C-012 — Protocol — OpenDental dual-key auth

- **Type:** protocol
- **Source:** PRD.md §0 §3 §15.7; docs/adapters.md.
- **Constraint:** Every OpenDental request carries `Authorization: ODFHIR {DeveloperKey}/{CustomerKey}` plus `Content-Type: application/json`.

## C-013 — Protocol — OpenDental rate limit / pagination by mode

- **Type:** protocol
- **Source:** PRD.md §15.6 §15.1; docs/adapters.md.
- **Constraint:**
  - `api_mode === 'remote'`: 5s read throttle, 1s write throttle, max 100 items/page.
  - `api_mode === 'local' | 'service'`: no throttle, max 1000 items/page.
  - Pagination loops via `Offset` parameter until `items.length < limit`.
  - Incremental sync uses `DateTStamp` query parameter.

## C-014 — Protocol — webhook acknowledgment is fire-and-forget

- **Type:** protocol
- **Source:** PRD.md §10; docs/eligibility.md (Webhook-Triggered Verification).
- **Constraint:**
  - `POST /api/webhooks/opendental` validates secret, persists a `webhook_process` job, and returns 200 immediately.
  - Webhook handlers must NOT execute downstream work inline. OpenDental retries non-200 responses for up to 3 days.
  - Required payload fields: `EventType`, `TableName`, `KeyNum`. `ClinicId` required to fan out to eligibility.

## C-015 — Protocol — worker is single-job-per-invocation

- **Type:** protocol
- **Source:** docs/jobs.md.
- **Constraint:**
  - `POST /api/internal/worker` processes exactly one job per call.
  - External scheduler (Vercel Cron, OS cron) determines throughput.
  - `vercel.json` ships with `*/1 * * * *` (every minute) by default.

## C-016 — NFR — token lifetimes and rotation

- **Type:** nfr
- **Source:** PRD.md §8; docs/auth.md.
- **Constraint:**
  - Access token: 15m default (`JWT_EXPIRY`).
  - Refresh token: 7-day default (`REFRESH_TOKEN_EXPIRY_DAYS`), single-use, rotated on every refresh.
  - Reuse of a rotated refresh token must be rejected.
  - Frontend token storage: module-scoped variables only; never `localStorage` / `sessionStorage`.

## C-017 — NFR — encryption requirements

- **Type:** nfr
- **Source:** PRD.md §8 §14; docs/architecture.md; docs/deployment.md.
- **Constraint:**
  - TLS 1.2+ in transit; HTTPS only.
  - PostgreSQL with encrypted storage at rest.
  - Payer/PMS credentials encrypted with AES-256-GCM via `server/services/encryption/credentials.ts`.
  - `JWT_SECRET` min 32 chars, unique per environment.
  - `CREDENTIAL_ENCRYPTION_KEY` 64 hex chars (32 bytes), unique per environment.

## C-018 — NFR — password policy

- **Type:** nfr
- **Source:** PRD.md §8; docs/auth.md.
- **Constraint:** `BCRYPT_ROUNDS` default 12, min 10, max 15. Strength validator: 8+ chars, at least one uppercase, one lowercase, one number.

## C-019 — NFR — audit retention

- **Type:** nfr
- **Source:** PRD.md §8 (HIPAA Compliance); docs/deployment.md.
- **Constraint:**
  - PRD requirement: 6 years (HIPAA).
  - Deployment guide currently suggests "consider archiving after 90 days." → RESOLVE before production: see WARNING #2.

## C-020 — NFR — no PHI in URLs, logs, or error messages

- **Type:** nfr
- **Source:** PRD.md §8 §15.8; docs/deployment.md.
- **Constraint:** Patients accessed by UUID only — never by name/DOB in URL paths. `errorHandler` middleware redacts SSN patterns, phones, emails, DOBs, insurance IDs from any error before it is logged or returned.

## C-021 — NFR — multi-tenant isolation enforced by middleware, not by trust

- **Type:** nfr
- **Source:** docs/auth.md (Clinic Scope); docs/architecture.md.
- **Constraint:** Every list/detail query passes through `getClinicScope(user, requestedClinicId)`. Cross-clinic access by `staff_admin` or `staff_user` must return 404, not 403, to avoid leaking existence.

## C-022 — NFR — design system (frontend)

- **Type:** nfr
- **Source:** PRD.md §15.9; README.md (Design System); DentalFlow_Screen_Designs.md.
- **Constraint:**
  - Dark glassmorphic theme; cyan accent `#22d3ee`; navy backgrounds `#0b0f1a / #1a2235 / #243049`.
  - DM Sans (UI), Space Mono (data).
  - styled-jsx only — no Tailwind, no other CSS frameworks.
  - Backdrop blur, gradient cards, staggered animations preserved.

## C-023 — Schema — pms_config JSONB shape (OpenDental)

- **Type:** schema
- **Source:** docs/database.md; PRD.md §2.
- **Constraint:**
  - `pms_config` JSONB on `clinics` carries: `api_mode` (`remote | local | service`), `base_url`, `developer_key` (encrypted), `customer_key` (encrypted), `econnector_url` (nullable), `api_tier`, `last_sync_at`, `sync_interval_minutes`.
  - Future PMS types use a different shape but must remain JSONB.

## C-024 — Schema — eligibility_checks.result_details shape

- **Type:** schema
- **Source:** docs/database.md (eligibility_checks).
- **Constraint:** JSONB carries `annualMaximum`, `annualMaximumUsed`, `deductible`, `deductibleMet`, `coveragePercentages: { preventive, basic, major, ortho }`, `copays: [{ category, amount }]`, `waitingPeriods: [{ category, endDate }]`. Commercial benefits are mandatory; Medicaid records may leave most fields null.

## C-025 — Schema — eob_records.line_items shape

- **Type:** schema
- **Source:** docs/database.md (eob_records); PRD.md §2; docs/adapters.md (RawEOBLineItem).
- **Constraint:** Each line item: `patient_name`, `patient_pms_id`, `service_date`, `procedure_code` (CDT), `tooth_number`, `fee_charged`, `allowed_amount`, `paid_amount`, `adjustment`, `patient_responsibility`, `denial_code | null`, `denial_reason | null`.

## C-026 — Schema — jobs.execution_log shape

- **Type:** schema
- **Source:** docs/jobs.md; docs/database.md (jobs).
- **Constraint:** JSONB array of `{ step: number, action: string, status: 'started'|'completed'|'failed'|'skipped', message: string, timestamp: ISO, durationMs?: number, data?: unknown }`. Worker appends at minimum a "started" and a "completed/failed" entry; handlers may append more.

## C-027 — Protocol — eligibility batch threshold setting

- **Type:** protocol
- **Source:** docs/eligibility.md (Batch Verification); PRD.md §2 (Settings example).
- **Constraint:** `verification_threshold_days` setting drives staleness check (default 30). Insurance with `lastVerifiedAt < (now - threshold)` OR null is queued.

## C-028 — Protocol — EOB auto-post threshold setting

- **Type:** protocol
- **Source:** docs/architecture.md (Auto-Post Conditions); PRD.md §2.
- **Constraint:** `settings.eob.auto_post_threshold` (default $250). Per-line `paid` greater than threshold flags the EOB even when all other rules pass.

## C-029 — NFR — frontend client must auto-refresh on 401

- **Type:** nfr
- **Source:** docs/auth.md (Frontend Token Management).
- **Constraint:** `lib/api.ts` request helper transparently retries the original request after a successful refresh. On refresh failure, dispatches an `auth:logout` custom event; `AuthContext` redirects to `/login`.

## C-030 — Protocol — EOB requires claims sync as prerequisite

- **Type:** protocol
- **Source:** docs/architecture.md (Claims Sync Prerequisite); docs/jobs.md.
- **Constraint:** `eob_sync` jobs invoke `syncClaims` as a prerequisite step so the triage engine has `claims_cache` rows to match against. Standalone `sync_claims` jobs may also run.
