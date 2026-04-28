# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-26)

**Core value:** Automate the routine 90–95% of insurance eligibility verification and EOB posting end-to-end against real on-prem OpenDental — and surface only the exceptions to clinic staff.
**Current focus:** Phase 3.5 — Real Clearinghouse EOB Ingestion (REQ-EOB-005), the hard prerequisite for Muath's pilot.

## Current Position

Phase: 3.5 of 7 effective (Real Clearinghouse EOB Ingestion)
Plan: 3 of 5 complete in current phase — Wave 0 done, Wave 1 done (Plans 02 + 03 complete), Wave 2 next
Status: Plan 03 complete. Plan 04 (Wave 2) is blocked on DXC sandbox creds — see `.planning/phases/03.5-real-clearinghouse-eob/DXC-ENROLLMENT.md` (owner: Faisal, escalate 2026-05-10). When unblocked, the real source's `fetch()` body hands raw EDI text to `parse835` then `mapParsed835ToRawEOB` — no parser logic in the HTTP layer.
Last activity: 2026-04-27 — Plan 03.5-03 complete: x12-parser@1.3.0 installed; edi835 parser + pure mapper landed; PHI-safe error wrapping; BPR vs sum(CLP04) + net(PLB) reconciliation guard; 11 fixture-driven unit tests green; 22 tests pass overall.

Progress: [███████████░░░░░░░░░] 4/8 phases complete (50%) — Phases 1–4 shipped on `main`; Phase 3.5 in progress (3/5 plans), Phases 5, 6, 7 remain.

## Performance Metrics

**Velocity:**
- Total plans completed (GSD-tracked): 3 (03.5-01, 03.5-02, 03.5-03)
- Average duration: ~38 min (three samples)
- Total execution time: ~115 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation, Auth & RBAC | shipped | shipped | n/a |
| 2. PMS Sync & Eligibility Engine | shipped | shipped | n/a |
| 3. EOB Engine & Triage | shipped | shipped | n/a |
| 4. Frontend Wiring & Prototype UI | shipped | shipped | n/a |
| 3.5. Real Clearinghouse EOB Ingestion | 3/5 | ~115 min so far | ~38 min |

**Recent Trend:**
- Last 5 plans: 03.5-03 (~35 min, 3 tasks, 4 files created / 4 modified, 11 tests added, 2 Rule-1 deviations — fixture BPR fix + plan-spec BPR05 correction); 03.5-02 (~35 min, 3 tasks, 5 files created / 2 modified, 11 tests added, 0 deviations); 03.5-01 (~45 min, 3 tasks, 10 files created, 1 human-action checkpoint resolved)
- Trend: TDD discipline holding; deviations bounded to Rule 1 fixture/spec corrections; pure-function discipline enforced via grep on mapper.

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

**From Plan 03.5-01:**
- **Vitest 1.x** chosen over Jest as the test runner (ESM-native, matches Next.js 16 toolchain, no ts-jest config burden).
- **DXC enrollment owner = Faisal** (technical lead). Sami + Muath ops as alternates.
- **Plan 04 (Wave 2) gated on `sandbox_creds_received: true`** in `DXC-ENROLLMENT.md` frontmatter. Do NOT schedule until DXC sandbox creds arrive or pivot decision lands.
- **Stedi documented as Plan B fallback** if DXC creds not received by 2026-05-10 escalation deadline.

**From Plan 03.5-02:**
- **`IClearinghouseEOBSource`** is the internal source contract — scoped to the clearinghouse folder, NOT exported from `payer/types.ts`. Callers always go through `DentalXChangeAdapter`.
- **`simpleHash` lives in `clearinghouse/utils.ts`** (hoisted from `dentalxchange.ts`). Avoids the circular dep that would arise from `dentalxchange-source-mock.ts` importing back from its parent.
- **DXC credentials dual-shape locked:** legacy bare-string OR new JSON `{ eligibility?: {...}, payment?: {...} }`. `decryptDXCCredentials` in `payer/registry.ts` supports both. See RESEARCH.md Pitfall 6.
- **Mode resolution precedence locked:** `PAYER_MOCK_MODE=true` > placeholder/missing creds > explicit `eobMode` > default `'production'`. `featuresEnabled.eob === false` skip stays at engine layer (engine.ts:54), NOT in adapter.
- **`RealClearinghouseEOBSource` is a Wave 2 stub today** — throws `PayerConnectionError("not implemented yet — Wave 2 (plan 03.5-04)")`. Plan 04 replaces the body.

**From Plan 03.5-03:**
- **x12-parser@1.3.0 actual API verified** — class is `X12parser` (lowercase 'p'); segments are `{ name, '1', '2', '1-1': composite }` with 1-indexed string-numeral keys (NOT `seg.elements: string[]` as RESEARCH.md sketched). Composite SVC01 is pre-split: `seg["1"]="AD"`, `seg["1-1"]="D2740"`.
- **Canonical `checkNumber` = TRN02 trace number** — in 5010 X221A1, BPR has no check-number element (BPR05 is payment format code, e.g., "CCP"). TRN02 is the unique payment identifier matching the bank-side EFT. Parser falls back to BPR sources only if TRN02 absent.
- **Reconciliation rule:** `BPR02 == sum(CLP04) + net(PLB04)` with 1¢ tolerance; mismatch throws `PayerConnectionError(/reconciliation failed/)`.
- **Allowed-amount derivation locked:** `allowed = fee - sum(CO adjustments)` per dental 835 standard. Denial detection uses CARC reason set `{4, 50, 96, 109, 197}`; first matching adjustment wins.
- **Mapper module is pure** — zero `await`, zero `db.`, zero `console.`, zero `process.env`. Enforced by grep at task close.
- **PHI scrub:** parser error messages contain only X12 segment name + segment offset; `PHI_DIGIT_RUN = /[0-9]{8,}/g` regex strips any 8+ digit run from upstream error messages. PHI scrub regression test asserts no 9+ digit runs in thrown messages.

### Pending Todos

[From .planning/todos/pending/ — ideas captured during sessions]

None yet.

### Blockers/Concerns

[Issues that affect future work]

- **Phase 3.5 prerequisite for pilot:** No production-readiness gate can pass while `retrieveEOBs` returns mock 835 payloads. Phase 3.5 must complete before Phase 7.
- **Phase 3.5 Wave 2 (Plan 04) blocked on DXC sandbox credentials.** Owner: Faisal. Escalation: 2026-05-10. Tracker: `.planning/phases/03.5-real-clearinghouse-eob/DXC-ENROLLMENT.md`. Wave 1 (Plans 02 + 03) can land in parallel against the abstracted `IClearinghouseEOBSource` interface — do NOT schedule Plan 04 until tracker frontmatter shows `sandbox_creds_received: true`.
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

Last session: 2026-04-27 (Plan 03.5-03 execution — sequential, autonomous, on main)
Stopped at: Plan 03.5-03 complete. x12-parser@1.3.0 installed; `parse835` (PHI-safe streaming wrapper, ISA-driven delimiters) + `mapParsed835ToRawEOB` (pure module, BPR/CLP/PLB reconciliation guard) shipped; 11 fixture-driven unit tests green; 22 tests pass overall; tsc clean. Two Rule-1 fixes recorded: delta-dental fixture BPR (840 → 720), and BPR05 = check-number plan spec correction (canonical checkNumber sourced from TRN02). Plan 04 (Wave 2 — RealClearinghouseEOBSource HTTP body) is BLOCKED on DXC sandbox creds.
Resume file: `.planning/phases/03.5-real-clearinghouse-eob/03.5-04-PLAN.md` — only resumable once DXC sandbox creds arrive (or pivot decision to Stedi). Track via `DXC-ENROLLMENT.md` frontmatter `sandbox_creds_received`.
