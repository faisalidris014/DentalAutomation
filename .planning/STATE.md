# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-26)

**Core value:** Automate the routine 90–95% of insurance eligibility verification and EOB posting end-to-end against real on-prem OpenDental — and surface only the exceptions to clinic staff.
**Current focus:** Phase 3.5 — Real Clearinghouse EOB Ingestion (REQ-EOB-005), the hard prerequisite for Muath's pilot.

## Current Position

Phase: 3.5 of 7 effective (Real Clearinghouse EOB Ingestion)
Plan: 0 of TBD in current phase
Status: Ready to plan
Last activity: 2026-04-26 — `/gsd-ingest-docs` synthesized 14 documents (PRD + 4 SPECs + 9 DOCs) into `.planning/intel/`; ROADMAP, REQUIREMENTS, PROJECT, and STATE bootstrapped from intel.

Progress: [██████████░░░░░░░░░░] 4/8 phases complete (50%) — Phases 1–4 shipped on `main`; Phases 3.5, 5, 6, 7 remain.

## Performance Metrics

**Velocity:**
- Total plans completed: shipped pre-GSD (Phases 1–4 landed via direct commits before GSD bootstrap)
- Average duration: n/a (no GSD-tracked plans yet)
- Total execution time: n/a

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation, Auth & RBAC | shipped | shipped | n/a |
| 2. PMS Sync & Eligibility Engine | shipped | shipped | n/a |
| 3. EOB Engine & Triage | shipped | shipped | n/a |
| 4. Frontend Wiring & Prototype UI | shipped | shipped | n/a |

**Recent Trend:**
- Last 5 plans: n/a (pre-GSD shipping)
- Trend: First GSD-tracked phase begins at 3.5

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table (D-001 → D-018).
Recent decisions affecting current work:

- **D-014 (LOCKED 2026-04-26):** Hosting target is Vercel + Neon — supersedes PRD §14 §15.15 Azure language. Drives Phase 7 deployment work and Phase 5 doc cleanup.
- **D-009 / REQ-EOB-005:** DentalXChange `retrieveEOBs` body is a deterministic mock 835 generator; production swap is the entirety of Phase 3.5.
- **D-016 (⚠️ Revisit):** Six-rule triage shipped, but PRD §6 lists 7 flag reasons (duplicate-EOB missing). Resolution scheduled in Phase 5.
- **D-017 (⚠️ Revisit):** Audit log retention — PRD says 6yr, deployment guide says 90d archive. Enforcement work scheduled in Phase 6.
- **D-012 (⚠️ Revisit):** Worker auth is `Bearer ${JWT_SECRET}` raw secret; Vercel pilot wants `CRON_SECRET` migration. Tracked in Phase 7.

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- **Phase 3.5 prerequisite for pilot:** No production-readiness gate can pass while `retrieveEOBs` returns mock 835 payloads. Phase 3.5 must complete before Phase 7.
- **Open WARNINGS in `INGEST-CONFLICTS.md` (3):** Audit retention 6yr vs 90d, recalls/agents PRD scope drift, EOB triage 7th rule (duplicate-check). All three resolve in Phase 5 or Phase 6 — none currently blocking Phase 3.5 itself.
- **Working tree drift at ingest:** `docs/adapters.md` and `server/adapters/pms/opendental/adapter.ts` have uncommitted changes that should be reviewed before starting Phase 3.5 to ensure the adapter baseline is stable.

## Deferred Items

Items acknowledged and carried forward from previous milestone close:

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| EOB | Real clearinghouse `retrieveEOBs` (REQ-EOB-005) | Active in Phase 3.5 | 2026-04-26 (deferred from Phase 3 to ship the demo) |
| HIPAA | 6-year audit retention enforcement | Active in Phase 6 | 2026-04-26 (PRD §8 vs deployment guide drift) |
| Worker auth | Migrate from `Bearer ${JWT_SECRET}` to Vercel `CRON_SECRET` | Active in Phase 7 | 2026-04-26 (tied to D-014 hosting) |
| PMS | Local agent / VPN tunnel for clinic LAN (REQ-PMS-002) | Active in Phase 7 | 2026-04-26 (pilot prerequisite) |
| PMS v2 | EagleSoft, SoftDent, Dentrix, Curve adapters | v2 backlog | 2026-04-26 |
| Payer v2 | Minnesota Medicaid, Availity, pVerify, OpenDental EOB API | v2 backlog | 2026-04-26 |
| Automation v2 | Claims submission, AI receptionist, mobile app, full multi-tenant SaaS | v2 backlog / out of scope | 2026-04-26 |

## Session Continuity

Last session: 2026-04-26 (during `/gsd-ingest-docs` bootstrap)
Stopped at: Bootstrap of `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/STATE.md` from `.planning/intel/SYNTHESIS.md`. Coverage validated: 31/31 requirements mapped.
Resume file: None — next step is `/gsd-plan-phase 3.5` to plan the real clearinghouse EOB ingestion.
