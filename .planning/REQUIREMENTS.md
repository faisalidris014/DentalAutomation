# Requirements: DentalFlow

**Defined:** 2026-04-26 (synthesized from `.planning/intel/requirements.md` during `/gsd-ingest-docs`)
**Core Value:** Automate the routine 90–95% of insurance eligibility verification and EOB posting end-to-end against real on-prem OpenDental — and surface only the exceptions to clinic staff.

> **Status legend:**
> - `IMPLEMENTED` — covered by shipped DOCs describing committed code (Phases 1–4 in `main`).
> - `PARTIAL` — partially implemented, items remain.
> - `PENDING` — PRD scope or new requirement not yet reflected in shipped code.
> - `DRIFTED` — PRD shape and DOC reality diverge; resolution scheduled.
>
> Status flags are preserved verbatim from intel synthesis. See `.planning/intel/requirements.md` for full acceptance criteria and source citations.

---

## v1 Requirements

### Authentication

- [x] **REQ-AUTH-001** — JWT authentication with refresh rotation. *Status: IMPLEMENTED.*
- [x] **REQ-AUTH-002** — Role-based access control with three roles (`it_admin`, `staff_admin`, `staff_user`). *Status: IMPLEMENTED.*

### PMS Integration

- [x] **REQ-PMS-001** — PMS-agnostic adapter pattern (`IPMSAdapter`). *Status: IMPLEMENTED for OpenDental.*
- [ ] **REQ-PMS-002** — OpenDental on-premise connection support (dual-key auth, mode-aware throttling). *Status: PARTIAL — adapter + dual-key auth + mode-aware throttling shipped; local agent / WebSocket tunnel for clinic LAN not yet built.*
- [x] **REQ-PMS-003** — Dev mock mode for PMS writes. *Status: IMPLEMENTED.*

### Sync

- [x] **REQ-SYNC-001** — Patient/insurance/claims sync into local cache (`patients_cache`, `insurance_cache`, `claims_cache`). *Status: IMPLEMENTED.*

### Eligibility

- [x] **REQ-ELIG-001** — On-demand eligibility verification (12-step engine). *Status: IMPLEMENTED.*
- [x] **REQ-ELIG-002** — Nightly batch eligibility verification (scheduler + threshold + summary notification). *Status: IMPLEMENTED.*
- [x] **REQ-ELIG-003** — Day-of-service recheck (6 AM clinic local). *Status: IMPLEMENTED.*
- [x] **REQ-ELIG-004** — Webhook-driven eligibility on appointment/insurance change. *Status: IMPLEMENTED.*
- [x] **REQ-ELIG-005** — Commercial benefits parsing via clearinghouse (DentalXChange). *Status: IMPLEMENTED for request shape and result envelope.*

### EOB

- [x] **REQ-EOB-001** — EOB retrieval from payer adapters. *Status: IMPLEMENTED — but uses deterministic mock 835 generator pending Phase 3.5 swap (REQ-EOB-005).*
- [x] **REQ-EOB-002** — Six-rule auto-post triage. *Status: IMPLEMENTED. Note: PRD §6 includes a 7th flag reason ("duplicate EOB by check_number") not present in shipped triage; reconciliation in Phase 5.*
- [x] **REQ-EOB-003** — Manual review and post for flagged EOBs. *Status: IMPLEMENTED.*
- [x] **REQ-EOB-004** — Weekly EOB summary report. *Status: IMPLEMENTED.*
- [ ] **REQ-EOB-005** — Real clearinghouse EOB ingestion (replace mock 835 generator with real DentalXChange API + 835 EDI parser; fallbacks: Availity, pVerify, OpenDental EOB API). *Status: PENDING — hard prerequisite for pilot.*

### Jobs

- [x] **REQ-JOBS-001** — PostgreSQL-backed job queue (12 job types, retries, exec log). *Status: IMPLEMENTED.*
- [x] **REQ-JOBS-002** — Job management API (`/api/jobs`, cancel, retry). *Status: IMPLEMENTED.*

### Audit

- [x] **REQ-AUDIT-001** — Audit log for every PHI access. *Status: IMPLEMENTED. Note: PRD requires 6yr retention; deployment guide currently 90d archive — retention policy enforcement scheduled in Phase 6.*

### Notifications

- [x] **REQ-NOTIF-001** — Auto-generated platform notifications (10 types, severity, deep-link). *Status: IMPLEMENTED.*

### Webhook

- [x] **REQ-WEBHOOK-001** — OpenDental webhook receiver (shared-secret auth, fire-and-forget, fan-out to `webhook_process`). *Status: IMPLEMENTED.*

### Clinic / User / Patient

- [x] **REQ-CLINIC-001** — Clinic CRUD with PMS health check. *Status: IMPLEMENTED.*
- [x] **REQ-USER-001** — User CRUD with role guards. *Status: IMPLEMENTED.*
- [x] **REQ-PATIENT-001** — Patient lookup & detail. *Status: IMPLEMENTED.*

### Dashboard

- [x] **REQ-DASHBOARD-001** — Role-specific dashboard KPIs (IT-Admin / Staff-Admin / Staff-User). *Status: IMPLEMENTED.*

### Recalls

- [ ] **REQ-RECALLS-001** — Derived recalls + reminder queueing. *Status: IMPLEMENTED in code, but **outside PRD §0 scope**. Scope reconciliation in Phase 5 — promote to official scope or mark demo-only.*

### Agents

- [ ] **REQ-AGENTS-001** — Agent monitor for IT Admin. *Status: IMPLEMENTED in code (synthesizes per-clinic health), but **outside PRD §0 scope** for the real local agent process. Scope reconciliation in Phase 5.*

### Settings

- [x] **REQ-SETTINGS-001** — Clinic + system settings with payer configs (encrypted credentials at rest). *Status: IMPLEMENTED.*

### UI

- [x] **REQ-UI-001** — 10 screens, 3 roles, dark glassmorphic theme (cyan #22d3ee + navy, DM Sans + Space Mono, styled-jsx only). *Status: IMPLEMENTED — prototype wired to real APIs; no `mockApi.ts` references remain.*

### HIPAA

- [ ] **REQ-HIPAA-001** — HIPAA-from-day-one operational baseline (encryption, audit, PHI scrubbing, JWT 15m, bcrypt ≥12, BAAs). *Status: PARTIAL — most controls implemented; pending items: 6yr audit retention enforcement, PHI-scrubbing audit, key rotation runbook, signed BAAs with Vercel + Neon. Phase 6.*

### Pilot

- [ ] **REQ-PILOT-001** — Muath's Minnesota clinic pilot scope (real on-prem OpenDental, Delta Dental + MetLife + Cigna, ~$400/mo pilot pricing). *Status: PENDING — dev seed is a different clinic; pilot identity not yet provisioned. Phase 7.*

## v2 Requirements

Deferred from current pilot scope. Tracked here for future milestones.

### Future PMS Integrations

- **REQ-PMS-V2-001** — EagleSoft adapter (additive — no business-logic changes per `IPMSAdapter`).
- **REQ-PMS-V2-002** — SoftDent adapter.
- **REQ-PMS-V2-003** — Dentrix adapter.
- **REQ-PMS-V2-004** — Curve adapter.

### Future Payer Adapters

- **REQ-PAYER-V2-001** — Minnesota Medicaid adapter (`medicaid.minnesota` planned but not built; pilot is commercial-only).
- **REQ-PAYER-V2-002** — Availity clearinghouse adapter (EOB fallback).
- **REQ-PAYER-V2-003** — pVerify clearinghouse adapter (EOB fallback).
- **REQ-PAYER-V2-004** — OpenDental EOB API adapter (EOB fallback).

### Future Automation

- **REQ-V2-001** — Claims submission automation (PRD §0 deferred).
- **REQ-V2-002** — Recall management automation expansion (full campaign engine — current REQ-RECALLS-001 is derived/manual only).
- **REQ-V2-003** — AI receptionist / phone agent (separate product).
- **REQ-V2-004** — Native mobile app.
- **REQ-V2-005** — Multi-tenant SaaS infrastructure beyond clinic-scoping.
- **REQ-V2-006** — Payment processing through OpenDental (requires $35 OD tier).

## Out of Scope

Explicitly excluded for the pilot. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| AI receptionist / phone agent | Separate product per PRD §0; promoted to v2 backlog only. |
| Claims submission automation | Deferred per PRD §0; not blocking the eligibility + EOB pilot loop. |
| Native mobile app | Web-first per PRD §0; mobile only if pilot validates demand. |
| Payment processing via OpenDental | Requires $35 OD tier; out of pilot pricing envelope. |
| Minnesota Medicaid adapter | Pilot is commercial-only (Delta Dental, MetLife, Cigna). |
| Multi-tenant SaaS infrastructure beyond clinic-scoping | PRD framed pilot as "single-tenant per deployment"; clinic-scoping is shipped. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-AUTH-001 | Phase 1 | Complete |
| REQ-AUTH-002 | Phase 1 | Complete |
| REQ-JOBS-001 | Phase 1 | Complete |
| REQ-JOBS-002 | Phase 1 | Complete |
| REQ-AUDIT-001 | Phase 1 | Complete (retention enforcement → Phase 6) |
| REQ-NOTIF-001 | Phase 1 | Complete |
| REQ-CLINIC-001 | Phase 1 | Complete |
| REQ-USER-001 | Phase 1 | Complete |
| REQ-SETTINGS-001 | Phase 1 | Complete |
| REQ-PMS-001 | Phase 2 | Complete |
| REQ-PMS-003 | Phase 2 | Complete |
| REQ-SYNC-001 | Phase 2 | Complete |
| REQ-ELIG-001 | Phase 2 | Complete |
| REQ-ELIG-002 | Phase 2 | Complete |
| REQ-ELIG-003 | Phase 2 | Complete |
| REQ-ELIG-004 | Phase 2 | Complete |
| REQ-ELIG-005 | Phase 2 | Complete |
| REQ-WEBHOOK-001 | Phase 2 | Complete |
| REQ-PATIENT-001 | Phase 2 | Complete |
| REQ-EOB-001 | Phase 3 | Complete (mock 835; production source via REQ-EOB-005) |
| REQ-EOB-002 | Phase 3 | Complete (7th rule decision in Phase 5) |
| REQ-EOB-003 | Phase 3 | Complete |
| REQ-EOB-004 | Phase 3 | Complete |
| REQ-DASHBOARD-001 | Phase 4 | Complete |
| REQ-UI-001 | Phase 4 | Complete |
| REQ-EOB-005 | Phase 3.5 | Pending |
| REQ-RECALLS-001 | Phase 5 | Pending (scope reconciliation) |
| REQ-AGENTS-001 | Phase 5 | Pending (scope reconciliation) |
| REQ-HIPAA-001 | Phase 6 | Pending |
| REQ-PMS-002 | Phase 7 | Pending (local agent / VPN for pilot LAN) |
| REQ-PILOT-001 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 31 total
- Mapped to phases: 31
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-26*
*Last updated: 2026-04-26 after `/gsd-ingest-docs` ROADMAP.md creation.*
