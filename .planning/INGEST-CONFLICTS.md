## Conflict Detection Report

### BLOCKERS (0)

No locked-vs-locked contradictions, cycle errors, or unknown-confidence-low classifications were detected. None of the 14 ingested classifications carries `locked: true`, so the LOCKED-vs-LOCKED gate is not triggered. The cross-reference graph (README hubs to all DOCs and SPECs; eligibility/architecture/adapters cross-link tightly) contains no cycles. WARNING #1 and #5 were resolved by user decision during ingest on 2026-04-26 (see RESOLVED block). WARNING #2–#4 remain open and must be dispositioned during the relevant phases.

### RESOLVED DURING INGEST (2)

[RESOLVED 2026-04-26] Hosting target — Vercel + Neon (was WARNING #1)
  Decision: Vercel hosts the Next.js app + serverless functions + Vercel Cron. Neon is the managed PostgreSQL provider. Vercel BAA + Neon BAA replace the Microsoft Azure BAA chain previously cited in PRD.md §14 §15.15.
  Implications:
    - `vercel.json` cron → `POST /api/internal/worker` (already implemented).
    - Secrets live in Vercel project env vars (no Azure Key Vault).
    - Worker auth migration: `Bearer ${JWT_SECRET}` → validate Vercel-injected `CRON_SECRET` (tracked as roadmap follow-up).
    - PRD.md §14 + §15.15 require a docs-update phase to remove Azure language.
  Recorded in: `.planning/intel/decisions.md` D-014 (LOCKED).

[RESOLVED 2026-04-26] EOB production readiness — Phase 3.5 added (was WARNING #5)
  Decision: A new requirement REQ-EOB-005 captures the real-clearinghouse swap as Phase 3.5. The deterministic mock 835 generator stays available for dev mode; production must use a real source. Adapter candidates: DentalXChange (first), Availity, pVerify, OpenDental EOB API (per PRD §15.4). Phase 3.5 is a hard prerequisite for the pilot.
  Recorded in: `.planning/intel/requirements.md` REQ-EOB-005 (PENDING).

### WARNINGS (3)

[WARNING] Audit log retention — PRD vs deployment.md
  Found: PRD.md §8 (HIPAA Compliance) states "Audit logs retained for 6 years (HIPAA requirement)." docs/deployment.md (Security Checklist) instead says "Audit log table has retention policy (consider archiving after 90 days)."
  Impact: 90 days versus 6 years is the difference between a compliant audit trail and a HIPAA-violating one. The pilot is a regulated environment from day one. A 90-day archive policy without a 6-year retention story behind it would put the pilot in violation.
  → Adopt 6 years as the policy. Define how/where archived rows live (S3/Blob with object-lock, append-only audit table partitioned by month, or equivalent). Update docs/deployment.md to match PRD §8. Add the retention enforcement to the operational backlog.

[WARNING] Recall + Agent automation — PRD §0 "What NOT to Build" vs shipped DOCs
  Found: PRD.md §0 explicitly excludes recall-management automation ("Phase 4, not this build") and frames the pilot as "single-tenant per deployment." docs/api-reference.md, docs/jobs.md, and DentalFlow_Screen_Hierarchy.md describe `GET /api/recalls`, `POST /api/recalls`, the `recall_reminder` job type, an `/agents` IT-Admin route, and multi-tenancy is highlighted as a top-line README feature.
  Impact: Either the PRD's "What NOT to Build" list is stale and these features should be made official, or the implementation drifted past PRD scope and they should be marked demo-only until product approves them. Roadmapper needs the source-of-truth scope before it can plan Phase 5+.
  → Decide and amend the PRD. Recommended: promote recalls + agent visibility into the official PRD scope (they exist, they shipped, they demo well to Ilyas), and explicitly mark "claims submission automation," "AI receptionist," and "mobile app" as the only remaining out-of-scope items. If recalls + agents should NOT exist, file an explicit removal task.

[WARNING] EOB acceptance criteria — PRD §6 (7 flag reasons) vs docs/architecture.md (6 triage rules)
  Found: PRD.md §6 lists seven flag reasons including "Duplicate EOB (same check number already posted)." docs/architecture.md (Auto-Post Conditions) and the implemented `server/services/eob/triage.ts` describe six rules without a duplicate-check rule. PRD.md §6 also keys the threshold rule on `paid_amount` exceeding `$250` (configurable); DOC threshold rule does the same — that part agrees. The divergence is specifically the missing duplicate-check.
  Impact: Two competing acceptance variants for REQ-EOB-002. Synthesizing them into one would either silently drop the duplicate-check (PRD intent lost) or invent a rule that does not exist in code (DOC reality misrepresented). Both variants are preserved in `intel/requirements.md` REQ-EOB-002.
  → Decide whether the duplicate-check rule should ship as a 7th triage condition. If yes, add it to triage.ts plus an `eob_duplicate` triage_reason value, and update docs/architecture.md. If no, strike it from PRD.md §6 so the contract matches reality.

### INFO (5)

[INFO] Webhook auth pattern is shared-secret (DOC reality)
  Note: PRD.md §10 describes webhook source verification as "IP whitelist or signature — OpenDental's approach." The shipped implementation (docs/eligibility.md, docs/api-reference.md) uses a shared `WEBHOOK_SECRET` validated against the `x-webhook-secret` header (or `?secret=` query param). The DOC reality is the canonical answer; PRD prose is older. No action required — D-013 in `intel/decisions.md` records the resolved decision.

[INFO] Eligibility list endpoint path
  Note: PRD.md §7 wrote the eligibility history endpoint as `GET /api/eligibility/history`. The shipped path (docs/api-reference.md) is `GET /api/eligibility` (the verb is implied; querystring includes `patient_id`, `status`, `payer`, `date_from`, `date_to`). Frontend already calls the shipped path. No remediation needed beyond a one-line PRD fix during the next doc pass.

[INFO] Worker auth — `JWT_SECRET` raw bearer vs Vercel `CRON_SECRET`
  Note: docs/jobs.md ships `Authorization: Bearer ${JWT_SECRET}` as the worker auth. docs/deployment.md notes "Vercel Cron Jobs include the `CRON_SECRET` header automatically. For production, consider updating the worker auth to validate `CRON_SECRET` instead." This is a known follow-up tied to the hosting decision (WARNING #1) — if Vercel wins, switch to `CRON_SECRET`; if Azure, switch to managed-identity or a separate cron secret.

[INFO] Seed clinic identity ≠ pilot identity
  Note: docs/setup.md seed creates "Bright Smiles Dental" (Austin, TX) with placeholder OpenDental keys. PRD.md §0 names the pilot as Muath's clinic in Minnesota with real on-premise OpenDental. The seed is dev-only; pilot config has not yet been provisioned in `.planning/`. Action item already captured in `intel/context.md` open questions, not a conflict.

[INFO] Minnesota Medicaid adapter is planned, not built
  Note: docs/eligibility.md (Payer Adapter Registry) marks `medicaid.minnesota` as Planned with `MinnesotaMedicaidAdapter` not implemented. PRD.md §4 (and the Implementation Phases) defer this to "future clients with Medicaid patients" — pilot is commercial-only. PRD intent and DOC reality agree: nothing to build for the pilot.
