/**
 * Pure mapper layer: Parsed835 → RawEOBDocument.
 *
 * ─── Discipline contract (PATTERNS.md §"Pure-function discipline") ──────────
 *
 * This module MUST contain:
 *   - zero `await` calls
 *   - zero `db.` references
 *   - zero `console.` calls
 *   - zero `process.env` reads
 *
 * Mapper failures throw `PayerConnectionError` so the engine's outer try/catch
 * can flag the EOB rather than silently posting wrong amounts.
 *
 * ─── Reconciliation rule (T-3.5-RECONCILE) ──────────────────────────────────
 *
 * For every 835: BPR02 == sum(CLP04) + net(PLB04). PLB amounts are signed —
 * a negative PLB means the payer is taking money back (e.g., WO = withhold
 * for prior overpayment). Mismatch greater than 1 cent throws.
 *
 * ─── Allowed-amount derivation (dental 835 standard) ─────────────────────────
 *
 * For each service line:
 *   allowed                = fee - sum(CO adjustments)   // contractual obligation
 *   adjustment             = sum(CO adjustments)
 *   patientResponsibility  = sum(PR adjustments)
 *   paid                   = SVC03 (taken verbatim)
 *
 * Denials are surfaced when any adjustment carries a CARC reason code in the
 * known-denial set; first matching adjustment wins for `denialCode`/`denialReason`.
 *
 * ─── PHI scrub ───────────────────────────────────────────────────────────────
 *
 * Error messages in this module include only currency amounts and segment
 * names. They MUST NOT include claim IDs, subscriber IDs, or any 9+ digit
 * numerical run. The `edi835-mappers.test.ts` PHI scrub regression test
 * enforces this.
 */

import type {
  Parsed835,
  ParsedClaim,
  ParsedServiceLine,
  ParsedAdjustment,
  ProviderLevelAdjustment,
  AdjustmentGroupCode,
} from './edi835-types';
import type { RawEOBDocument, RawEOBLineItem } from '../types';
import { PayerConnectionError } from '../types';

/**
 * CARC reason-code → human-readable mapping for dental denial codes.
 * Source: Delta Dental / DXC companion guides; expand as fixtures surface
 * new codes. Unknown codes fall through to "CARC <code>".
 */
const CARC_REASON: Record<string, string> = {
  '1': 'Deductible amount',
  '2': 'Coinsurance amount',
  '3': 'Co-payment amount',
  '4': 'Procedure code is inconsistent with the modifier used',
  '23': 'Impact of prior payer(s) adjudication',
  '45': 'Charge exceeds maximum allowable',
  '50': 'Procedure not deemed medically necessary',
  '96': 'Non-covered charge(s)',
  '109': 'Claim not covered by this payer/contractor',
  '197': 'Precertification/authorization not obtained',
};

/**
 * CARC codes that signal a denial / non-payment outcome (rather than a routine
 * patient-responsibility split). The mapper only flags `denialCode` when an
 * adjustment carries one of these reasons.
 */
const DENIAL_REASON_CODES: ReadonlySet<string> = new Set([
  '4',
  '50',
  '96',
  '109',
  '197',
]);

/** Reconciliation tolerance — 1 cent of floating-point drift is acceptable. */
const RECONCILE_TOLERANCE_CENTS = 1;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mapDenialReason(code: string): string {
  return CARC_REASON[code] ?? `CARC ${code}`;
}

function sumAdjustmentsByGroup(
  adjustments: ParsedAdjustment[],
  group: AdjustmentGroupCode,
): number {
  let total = 0;
  for (const a of adjustments) {
    if (a.groupCode === group) total += a.amount;
  }
  return total;
}

function findFirstDenialAdjustment(
  adjustments: ParsedAdjustment[],
): ParsedAdjustment | undefined {
  for (const a of adjustments) {
    if (DENIAL_REASON_CODES.has(a.reasonCode)) return a;
  }
  return undefined;
}

function netPlbAmount(plbs: ProviderLevelAdjustment[]): number {
  let total = 0;
  for (const p of plbs) total += p.amount;
  return total;
}

function mapServiceLine(
  claim: ParsedClaim,
  line: ParsedServiceLine,
): RawEOBLineItem {
  const co = sumAdjustmentsByGroup(line.adjustments, 'CO');
  const pr = sumAdjustmentsByGroup(line.adjustments, 'PR');
  const denial = findFirstDenialAdjustment(line.adjustments);

  const allowed = round2(Math.max(0, line.fee - co));
  const adjustment = round2(co);
  const paid = round2(line.paid);
  const patientResponsibility = round2(pr);

  return {
    patientFirstName: claim.patientFirstName ?? '',
    patientLastName: claim.patientLastName ?? '',
    patientPmsId: claim.patientId,
    procedureCode: line.procedureCode,
    toothNumber: line.toothNumber,
    serviceDate: line.serviceDate ?? '',
    fee: round2(line.fee),
    allowed,
    paid,
    adjustment,
    patientResponsibility,
    denialCode: denial ? `${denial.groupCode}-${denial.reasonCode}` : undefined,
    denialReason: denial ? mapDenialReason(denial.reasonCode) : undefined,
    claimPmsId: claim.claimPmsId,
  };
}

function synthesizeClaimLevelLine(claim: ParsedClaim): RawEOBLineItem {
  const co = sumAdjustmentsByGroup(claim.claimLevelAdjustments, 'CO');
  const pr = sumAdjustmentsByGroup(claim.claimLevelAdjustments, 'PR');
  const denial = findFirstDenialAdjustment(claim.claimLevelAdjustments);
  return {
    patientFirstName: claim.patientFirstName ?? '',
    patientLastName: claim.patientLastName ?? '',
    patientPmsId: claim.patientId,
    procedureCode: 'UNSPECIFIED',
    serviceDate: '',
    fee: round2(claim.billed),
    allowed: round2(Math.max(0, claim.billed - co)),
    paid: round2(claim.paid),
    adjustment: round2(co),
    patientResponsibility: round2(pr || claim.patientResp),
    denialCode: denial ? `${denial.groupCode}-${denial.reasonCode}` : undefined,
    denialReason: denial ? mapDenialReason(denial.reasonCode) : undefined,
    claimPmsId: claim.claimPmsId,
  };
}

/**
 * Map a parsed 835 ERA to the canonical RawEOBDocument shape.
 *
 * @throws {PayerConnectionError} when:
 *   - `payment.checkNumber` is empty (no usable trace number)
 *   - `payer.name` is empty
 *   - reconciliation fails: `BPR02 != sum(CLP04) + net(PLB04)` (> 1 cent)
 */
export function mapParsed835ToRawEOB(parsed: Parsed835): RawEOBDocument {
  if (!parsed.payment.checkNumber) {
    throw new PayerConnectionError(
      '835 mapping failed: missing canonical check identifier (BPR/TRN)',
    );
  }
  if (!parsed.payer.name) {
    throw new PayerConnectionError(
      '835 mapping failed: missing N1*PR (payer name)',
    );
  }

  // Reconciliation guard.
  const sumClpPaid = parsed.claims.reduce((sum, c) => sum + c.paid, 0);
  const netPlb = netPlbAmount(parsed.providerLevelAdjustments);
  const expectedCents = Math.round((sumClpPaid + netPlb) * 100);
  const actualCents = Math.round(parsed.payment.amount * 100);
  if (Math.abs(expectedCents - actualCents) > RECONCILE_TOLERANCE_CENTS) {
    throw new PayerConnectionError(
      `BPR/CLP reconciliation failed: BPR02=$${(actualCents / 100).toFixed(2)} but sum(CLP04)+net(PLB)=$${(expectedCents / 100).toFixed(2)}`,
    );
  }

  const lineItems: RawEOBLineItem[] = [];
  for (const claim of parsed.claims) {
    if (claim.serviceLines.length === 0) {
      lineItems.push(synthesizeClaimLevelLine(claim));
      continue;
    }
    for (const line of claim.serviceLines) {
      lineItems.push(mapServiceLine(claim, line));
    }
  }

  return {
    checkNumber: parsed.payment.checkNumber,
    checkDate: parsed.payment.checkDate,
    checkAmount: parsed.payment.amount,
    payerName: parsed.payer.name,
    receivedDate: new Date().toISOString().split('T')[0],
    source: 'edi_835',
    lineItems,
    rawData: {
      transactionTraceNumber: parsed.payment.traceNumber,
      payeeName: parsed.payee.name,
      payeeNpi: parsed.payee.npi,
      claimsCount: parsed.claims.length,
      providerLevelAdjustmentsCount: parsed.providerLevelAdjustments.length,
    },
  };
}
