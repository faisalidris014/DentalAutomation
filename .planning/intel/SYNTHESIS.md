# Synthesis Summary

> Single entry point for the roadmapper and any downstream consumer of `.planning/intel/`. This file summarizes everything that was synthesized; the full intel lives in the sibling files.

---

## Inputs

- **Mode:** new (no pre-existing `.planning/` content beyond the classifier output).
- **Classifications:** 14 documents in `.planning/intel/classifications/`.
- **Precedence:** ADR > SPEC > PRD > DOC.
- **No locked ADRs in the input set.**
- **No cycles detected** in the cross-reference graph.

## Doc Counts by Type

| Type | Count | Sources |
|------|-------|---------|
| ADR | 0 | (none) |
| PRD | 1 | `PRD.md` |
| SPEC | 4 | `DentalFlow_Screen_Designs.md`, `DentalFlow_Screen_Hierarchy.md`, `docs/api-reference.md`, `docs/database.md` |
| DOC | 9 | `README.md`, `SHOWCASE-SCRIPT.md`, `docs/architecture.md`, `docs/adapters.md`, `docs/auth.md`, `docs/deployment.md`, `docs/eligibility.md`, `docs/jobs.md`, `docs/setup.md` |

## What Was Synthesized

| File | Contents |
|------|----------|
| `decisions.md` | 18 decisions (D-001 → D-018). Includes one explicitly UNRESOLVED entry — D-014 hosting target — flagged as a WARNING in the conflicts report. |
| `requirements.md` | 24 requirements grouped by domain: Auth (2), PMS (3), Sync (1), Eligibility (5), EOB (4), Jobs (2), Audit (1), Notifications (1), Webhook (1), Clinic (1), User (1), Patient (1), Dashboard (1), Recalls (1), Agents (1), Settings (1), UI (1), HIPAA (1), Pilot (1). Status flags: IMPLEMENTED, PARTIAL, PENDING, DRIFTED. |
| `constraints.md` | 30 constraints split across api-contract (4), schema (8), protocol (8), nfr (10). Covers API envelope, error codes, pagination, clinic scoping, schema indexes, adapter interfaces, OpenDental rate limit/auth, EOB triage threshold, audit retention, design system. |
| `context.md` | Project identity, business problem, phase status (1–4 complete), pilot client, architecture diagram, goals/non-goals, eight open questions with the hosting decision (D-014) called out as the highest priority. |

## Decisions — Locked vs Open

- **Locked by source consensus** (PRD + DOC + SPEC agree, no contradictions): D-001, D-002, D-003, D-004, D-005, D-006, D-007, D-008, D-010, D-011, D-016, D-017, D-018. Roadmapper can treat these as fixed.
- **Implemented but contains drift from PRD prose**: D-013 (webhook auth), D-015 (PMS mock mode is DOC-only — not in PRD), D-009 (clearinghouse adapter present but EOB body is a mock 835 generator).
- **Unresolved — must be decided by user before roadmap**: D-014 hosting target (Azure vs Vercel/Neon).

## Conflicts

| Bucket | Count |
|--------|-------|
| BLOCKERS | 0 |
| WARNINGS | 5 |
| INFO | 5 |

**WARNINGS (must resolve before routing):**

1. Hosting target — PRD says Azure, deployment.md says Vercel + Neon/Supabase.
2. Audit log retention — PRD requires 6 years, deployment.md suggests 90 days.
3. Recall + Agent automation — PRD §0 excludes them, but they ship in DOCs.
4. EOB acceptance criteria — PRD §6 has 7 flag reasons, triage.ts has 6 (missing duplicate-check).
5. EOB production readiness — DentalXChange `retrieveEOBs` is a deterministic mock 835 generator, must be replaced before pilot deploys.

**INFO (no action required, recorded for transparency):**

1. Webhook auth pattern is shared-secret (DOC), not IP whitelist (PRD prose).
2. Eligibility list endpoint path — PRD says `/api/eligibility/history`, code/doc says `/api/eligibility`.
3. Worker auth on Vercel — known follow-up tied to hosting decision.
4. Seed clinic ≠ pilot clinic.
5. Minnesota Medicaid adapter is planned (PRD and DOC agree).

Full report: `/.planning/INGEST-CONFLICTS.md`.

## Reading Order for Downstream

1. `INGEST-CONFLICTS.md` — resolve the five WARNINGS.
2. `decisions.md` — start at D-014 (the unresolved hosting decision); the rest is locked.
3. `requirements.md` — REQ-AUTH-*, REQ-PMS-*, REQ-ELIG-*, REQ-EOB-* are the load-bearing flows.
4. `constraints.md` — C-001 to C-004 (API contract), C-005 to C-009 (schema), C-010/C-011 (adapter contracts).
5. `context.md` — phase status, open questions, pilot identity.

## Status

**AWAITING USER — 5 competing/divergent items in WARNINGS need explicit resolution before the roadmapper writes ROADMAP.md.** No BLOCKERS were detected; the workflow may proceed once warnings are dispositioned.
