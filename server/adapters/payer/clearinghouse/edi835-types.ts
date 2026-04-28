/**
 * Internal representation of a parsed 835 ERA. NOT the public RawEOBDocument shape —
 * these types capture EDI-level structure before the mapper translates to the
 * canonical form consumed by the EOB engine.
 *
 * Loop hierarchy reference (X12 5010 X221A1):
 *   ISA / GS / ST           — envelope (not surfaced here)
 *   BPR / TRN               — payment header
 *   N1*PR / N1*PE           — payer / payee (loops 1000A / 1000B)
 *   LX                      — header number (not surfaced)
 *   CLP                     — claim payment (loop 2100)
 *     NM1*QC                — patient
 *     SVC                   — service line (loop 2110)
 *       DTM*472             — service date
 *       CAS                 — line-level adjustment
 *       REF*6R              — line item control number
 *     CAS                   — claim-level adjustment (when SVC absent)
 *   PLB                     — provider-level adjustment (e.g., WO takeback)
 */

export interface PayerInfo {
  /** N1*PR element 02 — e.g., "DELTA DENTAL OF MN" */
  name: string;
}

export interface PayeeInfo {
  /** N1*PE element 02 — e.g., "BRIGHT SMILES DENTAL" */
  name: string;
  /** N1*PE element 04 when element 03 == "XX" (NPI qualifier) */
  npi?: string;
}

export interface PaymentInfo {
  /** BPR02 — total monetary amount of the check / EFT */
  amount: number;
  /** BPR04 — payment method (ACH | CHK | NON | ...) */
  method: string;
  /**
   * BPR05 — used as the canonical check identifier downstream.
   * For 5010 X221A1 this is the issuer reference / check number.
   * Required for downstream dedup keys.
   */
  checkNumber: string;
  /** BPR16 — effective entry / payment date, normalized to YYYY-MM-DD */
  checkDate: string;
  /** TRN02 — trace number used to match bank-side EFT */
  traceNumber?: string;
}

export type AdjustmentGroupCode = 'CO' | 'PR' | 'OA' | 'PI';

export interface ParsedAdjustment {
  /** CAS01 — CO=contractual, PR=patient resp, OA=other, PI=payer initiated */
  groupCode: AdjustmentGroupCode;
  /** CAS02 — CARC reason code (e.g., "1", "45", "96") */
  reasonCode: string;
  /** CAS03 — adjustment monetary amount */
  amount: number;
}

export interface ParsedServiceLine {
  /** SVC01 composite element 2 — the CDT code (e.g., "D2740") with the AD: qualifier stripped */
  procedureCode: string;
  /** SVC01 composite element 1 — qualifier ("AD" for ADA dental, "HC" for HCPCS) */
  procedureQualifier: string;
  /** SVC02 — billed (line fee) */
  fee: number;
  /** SVC03 — paid */
  paid: number;
  /** SVC05 — units of service */
  units?: number;
  /** DTM*472 — service date, normalized to YYYY-MM-DD */
  serviceDate?: string;
  /** REF*TT or REF*TQ — dental tooth number when payer populates it */
  toothNumber?: string;
  /** CAS adjustments under this service line */
  adjustments: ParsedAdjustment[];
}

export interface ParsedClaim {
  /** CLP01 — sender's claim identifier (matches PMS) */
  claimPmsId: string;
  /** CLP02 — claim status code */
  claimStatusCode: string;
  /** CLP03 — total billed */
  billed: number;
  /** CLP04 — total paid for this claim */
  paid: number;
  /** CLP05 — total patient responsibility */
  patientResp: number;
  /** CLP07 — payer's internal claim control number (ICN) */
  payerClaimControl?: string;
  /** NM1*QC element 04 */
  patientFirstName?: string;
  /** NM1*QC element 03 */
  patientLastName?: string;
  /** NM1*QC element 09 (when element 08 == "MI") */
  patientId?: string;
  /** Service-line detail loops (2110) */
  serviceLines: ParsedServiceLine[];
  /** CAS segments at the claim level (no SVC parent) */
  claimLevelAdjustments: ParsedAdjustment[];
}

export interface ProviderLevelAdjustment {
  /** PLB01 — provider identifier */
  providerId: string;
  /** PLB02 — fiscal year-end date, normalized to YYYY-MM-DD */
  fiscalDate: string;
  /** PLB03 first sub-element — reason code (e.g., "WO" from "WO:CLAIMNUM") */
  reasonCode: string;
  /** PLB04 — adjustment amount; negative means payer is taking money back */
  amount: number;
}

export interface Parsed835 {
  payer: PayerInfo;
  payee: PayeeInfo;
  payment: PaymentInfo;
  claims: ParsedClaim[];
  providerLevelAdjustments: ProviderLevelAdjustment[];
}
