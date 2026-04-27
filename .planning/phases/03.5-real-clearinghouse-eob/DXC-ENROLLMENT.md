---
status: open
owner: AWAITING USER INPUT
opened: 2026-04-26
sandbox_creds_received: false
prod_creds_received: false
escalate_after: 2026-05-10
fallback: "Switch to Stedi (RESEARCH.md §Open Question 6) — JSON-only response, eliminates EDI parser path"
---

# DXC Partner Enrollment Tracker

> **Status:** OPEN — enrollment NOT yet requested. This file gates Wave 2 (Plan 04
> real DXC HTTP client + integration tests). Wave 1 (parser + mappers + mock-vs-real
> dispatch) can proceed against the abstracted `IClearinghouseEOBSource` interface
> in parallel.

## Contact

- Portal: https://developer.dentalxchange.com/
- Postman workspace: https://www.postman.com/dentalxchange/xconnect-apis (gated)
- Partner email: **AWAITING USER INPUT**
- Sales contact name: **AWAITING USER INPUT**
- Sales contact email / phone: **AWAITING USER INPUT**

## Owner Assignment

The named owner is responsible for:
1. Creating or signing into the DXC partner account on `developer.dentalxchange.com`
2. Requesting access to the **XConnect Payment API** (the ERA / 835 retrieval surface)
3. Driving the conversation with DXC's partner team to capture the required information below
4. Storing credentials in 1Password (NEVER in git, NEVER in plans/tickets)
5. Updating this tracker with status changes and the date received

Assign exactly one of:
- **Faisal** (technical lead, can drive integration discussions)
- **Sami** (NiftyByte co-founder, owns DXC business relationship)
- **Muath ops** (pilot clinic — already has a DXC account, fastest path to "is this clinic enrolled?")

Owner field above must be replaced before this tracker is considered active.

## Status Log

- 2026-04-26 — Tracker created during Phase 3.5 Plan 01 execution. Owner pending user assignment. Enrollment not yet requested.

(Append a new dated line for every status change.)

## Required Information (fill as it arrives)

These values come from the DXC partner team during/after the enrollment call.
Each is a hard prerequisite for a corresponding task in Plans 03 and 04.

- [ ] **Sandbox base URL** (`DXC_SANDBOX_API_BASE_URL`): TBD — gates Plan 03 real-client implementation
- [ ] **Production base URL** (`DXC_PAYMENT_API_BASE_URL`): TBD — gates pilot deploy in Phase 7
- [ ] **Auth scheme**: TBD (API key / OAuth2 client_credentials / Bearer token) — RESEARCH.md §Open Question 3; drives `decryptDXCCredentials()` JSON shape
- [ ] **Response format**: TBD (raw 835 EDI text / pre-parsed JSON) — RESEARCH.md §Open Question 2; if JSON, the EDI parser becomes optional
- [ ] **Credentials shape**: TBD (single key / per-API-surface) — RESEARCH.md §Pitfall 6; drives JSONB shape inside `payer_configs.credentials`
- [ ] **OAuth token URL** (if OAuth2): TBD
- [ ] **Token lifetime / refresh semantics** (if OAuth2): TBD
- [ ] **Documented rate limits**: TBD — drives module-level vs instance-level throttle decision (PATTERNS.md anti-pattern table)
- [ ] **Documented pagination** (if applicable): TBD
- [ ] **Webhook availability** (push vs poll): TBD — RESEARCH.md "Alternatives Considered" — webhook flagged v1.2 enhancement

## Muath Pilot Per-Payer ERA Enrollment

DXC ERA enrollment is per-clinic-per-payer. Wave 2 smoke test (REQ-EOB-005-D) requires
at least one of these to be live in DXC's portal for Muath's clinic.

- [ ] **Delta Dental of MN**: TBD — confirm enrollment status and ETA
- [ ] **MetLife**: TBD — confirm enrollment status and ETA
- [ ] **Cigna**: TBD — confirm enrollment status and ETA

## Escalation Path

If sandbox credentials have not arrived by `escalate_after` (2026-05-10):

1. **User decides:** continue waiting OR pivot to Stedi as Plan B.
2. If pivoting to Stedi: run `/gsd-plan-phase --replan` to swap the real-source target. Stedi has GA dental clearinghouse, JSON-only responses, 100 free transactions/month — eliminates the EDI parser path entirely.
3. **Wave 2 tasks remain blocked** until decision is made or credentials arrive.
4. **Wave 1 + Wave 0 + Wave 3 docs/static-grep can land independently** — no blocking dependency on DXC credentials for the abstracted parser and mappers.

## Fallback Plan B (Stedi)

Documented but not pre-built (RESEARCH.md §Open Question 6 recommendation).

- API: `GET /change/medicalnetwork/reports/v2/{transactionId}/835` returns 835 ERA as JSON
- Pricing: 100 free transactions/month on Basic plan
- Auth: Stedi API key (single credential)
- Implementation cost: 1–2 days to wire `StediEOBSource` into the existing `IClearinghouseEOBSource` interface — no EDI parser needed

## Resume Signal for GSD Executor

Per Plan 01 Task 3 `<resume-signal>`: type **"tracker created"** to the
orchestrator once `DXC-ENROLLMENT.md` exists with the user's chosen owner filled
in. Enrollment itself does NOT need to be complete to resume Wave 1 — only Wave 2
(Plan 04) is gated on `sandbox_creds_received: true` in this file's frontmatter.
