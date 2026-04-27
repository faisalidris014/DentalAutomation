# 835 EDI Test Fixtures

Anonymized X12 5010 X221A1 (835 ERA) sample documents used by Phase 3.5 unit tests
for the EDI parser, mappers, and `DentalXChangeAdapter` mock-vs-real dispatch.

## Purpose

These fixtures drive the Wave 1 unit tests for the new EDI 835 parser and mappers
(`server/adapters/payer/clearinghouse/edi835-mappers.test.ts`,
`server/adapters/payer/clearinghouse/dentalxchange.test.ts`).
Each fixture exercises a different EDI 835 scenario the production parser must
handle correctly.

## Files

| File | Scenario | Coverage |
|------|----------|----------|
| `cms-sample-1.835.txt` | Generic 5010 single CLP / single SVC, default delimiters (`*` element, `~` segment, `:` component) | Baseline parser path; structurally modeled on the public Nevada Medicaid sample (`medicaid.nv.gov/Downloads/provider/Sample_835_File.pdf`) |
| `delta-dental-anonymized.835.txt` | Delta Dental of MN payer, 4 patients × 2 procedures each (D0120 prophylaxis, D2740 crown), all with `AD:` ADA dental qualifier | Multi-claim parsing; per-claim NM1*QC patient extraction; CDT code parsing inside SVC composite |
| `metlife-anonymized.835.txt` | MetLife payer, single patient, denial scenario — paid=0, BPR=0, with deductible (`CAS*PR*1*100`) and contractual obligation (`CAS*CO*45*80`) | Denial path; CAS PR + CO segment handling on a single SVC |
| `cigna-anonymized.835.txt` | Cigna payer, single patient, copay scenario (`CAS*PR*3*25`) plus `CAS*CO*45*20` adjustment | Copay (CARC 3) handling; partial-pay path (paid=$155 of $200) |
| `non-default-delimiters.835.txt` | Same content as `cms-sample-1` but ISA element separator is `\|` and segment terminator is `\n` | Pitfall 3: parser must read delimiters from ISA, not hardcode them |
| `denial-cas.835.txt` | Single claim with three CAS segments (CO/PR/OA), denial code CO-4 ("Procedure code inconsistent with modifier"), plus `LQ*HE*N522` remark | Pitfall 5: multi-CAS handling; denial-code propagation to `RawEOBLineItem.denialCode` |
| `plb-takeback.835.txt` | Claim plus `PLB*…*WO:ICN-PLB-099999*-50.00` provider-level withhold (negative amount) | RESEARCH.md anti-pattern: BPR vs CLP reconciliation must account for `net(PLB)`; here `BPR=270 - 50 = 220`, sum(CLP04)=270, net(PLB)=-50 → reconciles |

All fixtures use file extension `.835.txt` for browse readability (per
PATTERNS.md §"Open Conventions for Planner to Decide" item 3).

## Anonymization Recipe (mandatory before commit)

These rules are applied to **every** fixture in this directory and **MUST** be
applied to any future fixture before it is committed.

| Field | Rule | Example |
|-------|------|---------|
| Insurance / subscriber IDs (NM1*QC ID qualifier MI) | `INS-TEST-NNN` (3-digit zero-padded sequence) | `INS-TEST-001` |
| Patient names (NM1*QC) | Pool of 5 fictional names — same pool used by the legacy mock generator at `dentalxchange.ts:187-188` | `JOHNSON*SARAH`, `THOMPSON*MICHAEL`, `DAVIS*JAMES`, `MARTINEZ*EMILY`, `WILSON*ROBERT` |
| Date of birth | Single deterministic ISO date `1980-01-01` (DOB is not present in 835 ERA at the patient level — it would appear in 837 claims; if a future fixture needs it, use only this value) | `19800101` |
| SSN-shaped digit runs | **NEVER** include any 9+ digit run that is not on the **Approved Numeric Values** allow-list below | — |
| Provider NPI (clinic) | Literal test value `1234567890` | `N1*PE*…*XX*1234567890` |
| Rendering provider NPI | Literal test value `9876543210` | `NM1*82*…*XX*9876543210` |
| Clinic / provider names | Fictional `BRIGHT SMILES DENTAL`, `DR PROVIDER` | — |
| Check numbers (BPR05) | `DEL-100001`, `MET-200001`, `CIG-300001`, … (payer prefix + zero-padded sequence) | `1234567890` for the bank account placeholder, NOT a check# (real check numbers do not appear in our fixtures) |
| Trace numbers (TRN02) | `TRACE-NNNNNN` (zero-padded sequence) | `TRACE-100001` |
| ICN / claim payer-control numbers (CLP07) | `ICN-{payer-3-letter}-NNNNNN` | `ICN-DEL-100001` |
| PMS claim IDs (CLP01) | `PMSCLAIM-NNNNNN` (zero-padded sequence) | `PMSCLAIM-100001` |
| Bank routing (BPR07) | Literal `111000025` (Federal Reserve test routing number, not real) | — |
| Bank accounts (BPR09 / BPR15) | Literal `0000000001`, `0000000002` | — |

### Approved Numeric Values (allow-list)

The X12 5010 spec **requires** several 9-digit fields in every interchange.
These are message-envelope plumbing, not PHI, and the anonymization gate must
exclude them. The complete allow-list of 9-digit-or-longer numeric runs that
may appear in fixtures:

| Value | Source | Why required |
|-------|--------|--------------|
| `1234567890` | clinic NPI test value | NPI fields (NM1\*…\*XX) need a 10-digit value; this is the recipe-fixed test NPI |
| `9876543210` | rendering provider NPI test value | Same; second well-known test NPI |
| `987654321` | Federal Tax ID test value (REF\*TJ) | TJ qualifier requires a 9-digit EIN; this is a documented non-real test EIN |
| `000000001` … `000000009` | ISA13 / IEA02 interchange control numbers | X12 spec mandates exactly 9 digits for ISA13 (interchange control number, repeated in IEA02) — cannot be shortened |
| `0000000001`, `0000000002` | bank account placeholders (BPR09/BPR15) | Account numbers must be numeric; these are clearly-fake all-zero test values |
| `021000021`, `111000025` | Federal Reserve test routing numbers | Public test ABA routing numbers, not real bank accounts |
| `8005551234`, `8005552345`, `8005553456`, `8005554567` | Toll-free test phone numbers (PER\*BL) | `800-555-XXXX` is the canonical test-phone-number range (FCC reserved); not real customer support lines |

### Anonymization Verify Gate

Run before committing any new or modified fixture:

```bash
grep -hoE '\b[0-9]{9,}\b' server/adapters/payer/clearinghouse/__fixtures__/*.835.txt \
  | sort -u \
  | grep -v -xE '(1234567890|9876543210|987654321|0000000001|0000000002|000000001|000000002|000000003|000000004|000000005|000000006|000000007|000000008|000000009|021000021|111000025|8005551234|8005552345|8005553456|8005554567)' \
  | grep -q . && echo "FAIL: untracked digit run found" || echo "OK"
```

A passing run prints `OK` and exits 0. Any other output means a forbidden numeric
run snuck in — typically a real SSN, real NPI, real bank account, or real phone
number. Stop and re-anonymize before committing.

## Adding a New Fixture

1. Download the source 835 from the DXC sandbox once enrollment is complete
   (Wave 0 / Plan 01 Task 3).
2. Anonymize **every** field in the table above. Use a script if you have access
   to one; otherwise hand-edit and grep the file for forbidden patterns:
   ```bash
   # Forbid any 9-digit run other than the two known test NPIs
   grep -E '\b[0-9]{9,}\b' new-fixture.835.txt | \
     grep -v -E '(1234567890|9876543210)' | \
     grep -q . && echo "FAIL: untracked digit run found" || echo "OK"
   ```
3. Add a row to the table above describing the scenario the fixture covers and
   the parser code path it exercises.
4. Commit only after the grep above prints `OK`.

## PHI Promise

> No real Protected Health Information has ever entered this directory. If a real
> 835 is needed for testing, it MUST be anonymized using the recipe in this file
> before commit. Real PHI in `__fixtures__/` would persist in git history forever
> — treat this directory as the same trust boundary as a public-facing repo.

This is the explicit mitigation for threat **T-3.5-PHI-1** (Information Disclosure
in fixture scope) and **T-3.5-FIXTURE-LEAK** (git history). See
`.planning/phases/03.5-real-clearinghouse-eob/03.5-01-PLAN.md` `<threat_model>`.

## Source Spec

Loop hierarchy and segment definitions are derived from the HIPAA 5010 X221A1
spec via the AccountableHQ developer guide:
<https://www.accountablehq.com/post/hipaa-835-file-format-a-developer-s-guide-to-edi-era-segments-loops-and-validation>

Public reference samples consulted (none committed verbatim — all hand-crafted
to the recipe above):

- Nevada Medicaid public sample 835: <https://medicaid.nv.gov/Downloads/provider/Sample_835_File.pdf>
- Stedi public X12 mirror for 835: <https://www.stedi.com/edi/x12/transaction-set/835>
- Delta Dental published 835 companion guide (PDF on `deltadentalins.com`)
