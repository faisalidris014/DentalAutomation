# DentalFlow Architecture Overview

## System Overview

DentalFlow automates insurance eligibility verification, EOB processing, patient management, and claims tracking for dental practices. It connects to Practice Management Systems (currently OpenDental) and insurance payers through adapter patterns.

## Architecture Diagram

```
Browser (React 19)
  └─ Next.js App Router (app/)
       ├─ Pages (app/(app)/) ─── SSR/CSR React components
       ├─ API Routes (app/api/) ─── Thin wrappers
       │    └─ Server Routes (server/routes/)
       │         └─ Middleware Chain:
       │              withErrorHandler → withAuth → withAudit → withValidation → handler
       │         └─ Services (server/services/)
       │              ├─ Auth (JWT, sessions, passwords)
       │              ├─ Eligibility (engine, batch, recheck, classifier)
       │              ├─ Sync (patients, insurance, claims, differ)
       │              ├─ EOB (parser, triage, engine, reporter)
       │              ├─ Queue (manager, worker)
       │              ├─ Notifications
       │              └─ Encryption (AES-256-GCM)
       │         └─ Adapters
       │              ├─ PMS (OpenDental: client, adapter, mappers, webhooks)
       │              └─ Payer (DentalXChange clearinghouse)
       │         └─ Database (PostgreSQL via Drizzle ORM)
       │              └─ 13 tables (schema.ts)
       └─ Webhooks (app/api/webhooks/) ─── OpenDental event receiver
```

## Directory Structure

- `app/` -- Next.js pages and API routes
  - `app/(app)/` -- Protected page routes (dashboard, patients, eligibility, etc.)
  - `app/api/` -- REST API endpoints
  - `app/login/` -- Public login page
- `components/` -- React components (layout, screens, ui)
- `context/` -- React context providers (AuthContext, RoleContext)
- `lib/` -- Frontend utilities (API client, adapters, formatters)
- `types/` -- Shared TypeScript type definitions
- `server/` -- Backend logic
  - `server/db/` -- Drizzle schema, connection, migrations, seed
  - `server/routes/` -- HTTP request handlers
  - `server/middleware/` -- Auth, validation, error handling, audit logging
  - `server/services/` -- Business logic (auth, eligibility, sync, eob, queue, notifications, encryption)
  - `server/adapters/` -- External system integrations (PMS, payer)
  - `server/config/` -- Environment config with Zod validation
- `styles/` -- Global CSS with design system variables

## Data Flow

### Patient/Insurance Sync

PMS (OpenDental API) --> Sync Engine --> `patients_cache` + `insurance_cache` tables

### Eligibility Verification

Trigger (batch/on-demand/webhook) --> Eligibility Engine --> Payer Classifier --> Payer Adapter --> `eligibility_checks` table --> Insurance cache update --> PMS write-back (if credentials available) --> Notification (if inactive/unknown)

### Background Jobs

Job created (manual/webhook/scheduler) --> `jobs` table (status: queued) --> Worker polls via `POST /api/internal/worker` --> Handler executes --> Status updated (completed/failed/retrying)

## Middleware Chain

Every protected API endpoint passes through this chain:

1. **withErrorHandler** -- Catches exceptions, returns appropriate HTTP status, scrubs PHI from error logs
2. **withAuth(allowedRoles)** -- Verifies JWT Bearer token, checks role against allowed roles, injects AuthContext
3. **withAudit(action)** -- Fire-and-forget audit logging to `audit_log` table (does not block response)
4. **withValidation(zodSchema)** -- Validates request body against Zod schema, returns 400 with field errors on failure

## Multi-Tenancy Model

- `clinics` table is the tenant boundary
- Every data table has a `clinic_id` foreign key
- `getClinicScope(user, requestedClinicId)` enforces access:
  - `it_admin`: can access any clinic (uses requested clinic ID if provided)
  - `staff_admin` / `staff_user`: locked to their assigned `clinicId`

## Security Layers

- **Authentication**: JWT access tokens (15m) + refresh token rotation (7d) with one-time use
- **Authorization**: Role-based (it_admin, staff_admin, staff_user) checked per endpoint
- **Credential Encryption**: Payer/PMS credentials encrypted at rest with AES-256-GCM
- **PHI Protection**: Error handler scrubs SSN, phone, email, insurance IDs, DOB from logs
- **Audit Trail**: Every API call logged with user, action, IP, user agent, timestamp
- **Clinic Isolation**: All queries scoped by clinic ID

## EOB Engine

### Service Layer

The EOB automation engine lives in `server/services/eob/` with four modules:

| File | Purpose |
|------|---------|
| `parser.ts` | Receives raw EOB documents from payer adapters. Matches each line item to a patient (via subscriber ID and name lookup against `patients_cache`) and a claim (via `claims_cache`). Produces structured `EobRecord` objects. |
| `triage.ts` | Applies auto-post rules to each parsed EOB. Records that pass all 6 conditions are auto-posted; others are flagged for manual review. |
| `engine.ts` | Orchestrates the full EOB sync: calls payer adapters, feeds results through parser and triage, posts eligible records to PMS, and creates notifications for flagged items. |
| `reporter.ts` | Generates weekly EOB processing summary reports (counts by triage status, total dollars posted, flagged items awaiting review). |

### Data Flow

```
Payer Adapter (retrieveEOBs)
  --> Parser (patient matching via patients_cache, claim matching via claims_cache)
    --> Triage (auto-post rule evaluation)
      --> Engine (PMS posting via postInsurancePayment)
        --> eob_records table + notifications
```

### Auto-Post Conditions

An EOB is auto-posted to the PMS only when every line item passes all 6 rules in `server/services/eob/triage.ts`:

1. **Patient matched** -- the parser resolved the line-item patient (by `patientPmsId` exact match or first/last/DOB fuzzy match) to a row in `patients_cache`
2. **Claim matched** -- a row exists in `claims_cache` for the matched patient (and `pmsClaimId` if the EOB carried one)
3. **Paid > 0** (unless denied) -- insurance-paid amount is greater than zero, or a denial code is present
4. **Paid <= threshold** -- per-line paid amount does not exceed the configurable auto-post threshold (`settings.eob.auto_post_threshold`, default `$250`)
5. **No denial** -- no `denialCode` is present on the line item
6. **Allowed <= fee** -- the allowed amount does not exceed the billed fee (catches negative adjustments)

If any rule fails, the EOB is set to `triage_status='flagged_for_review'` with a `triage_reason` listing every failing rule (deduplicated and joined with `;`), and a `eob_flagged` notification is created for `staff_admin` and `it_admin` roles.

### Claims Sync Prerequisite

The EOB triage engine requires claims data to match EOB line items against. The `syncClaims` function (added to `server/services/sync/engine.ts`) syncs claims from the PMS into the `claims_cache` table. This runs as part of the `sync_claims` job type and is also called as a prerequisite step during `eob_sync` jobs.

## Phase Status

- **Phase 1** (Complete): Auth, patient/insurance sync, eligibility verification (batch + on-demand + webhook), job queue, notifications, audit logging
- **Phase 2** (Complete): Claims sync, appointment sync, advanced reporting
- **Phase 3** (Complete): EOB retrieval, auto-post, triage, weekly reports

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2 (App Router) |
| UI | React 19, styled-jsx |
| Language | TypeScript 5 (strict) |
| Database | PostgreSQL + Drizzle ORM 0.45 |
| Auth | JWT (jose), bcryptjs |
| Validation | Zod 4 |
| Icons | Lucide React |
| Charts | Chart.js + react-chartjs-2 |
