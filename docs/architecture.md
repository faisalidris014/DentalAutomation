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
       │              ├─ Sync (patients, insurance, differ)
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
  - `server/services/` -- Business logic (auth, eligibility, sync, queue, notifications, encryption)
  - `server/adapters/` -- External system integrations (PMS, payer)
  - `server/config/` -- Environment config with Zod validation
- `data/mock/` -- Mock JSON data (legacy, being replaced by real DB)
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

## Phase Status

- **Phase 1** (Complete): Auth, patient/insurance sync, eligibility verification (batch + on-demand + webhook), job queue, notifications, audit logging
- **Phase 2** (Stubbed): Claims sync, appointment sync, advanced reporting
- **Phase 3** (Stubbed): EOB retrieval, auto-post, triage, weekly reports

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
