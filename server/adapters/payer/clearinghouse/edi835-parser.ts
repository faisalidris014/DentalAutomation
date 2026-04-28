/**
 * Streaming wrapper around `x12-parser@1.3.0` that turns raw 835 EDI text into
 * a typed `Parsed835` segment tree. Pure structural transform — no business
 * logic (auto-post decisions, denial classification, claim matching) lives
 * here; that's the mapper's job (`edi835-mappers.ts`).
 *
 * ─── Verified `x12-parser` API surface (against installed v1.3.0) ────────────
 *
 * Constructor:        `new X12parser(defaultEncoding?: BufferEncoding)`
 *                     (note: lowercase 'p' in `X12parser`, NOT `X12Parser` as
 *                     RESEARCH.md sketched.)
 * Stream model:       Transform stream — pipe a Readable into it, listen on
 *                     `data` events, errors arrive on the `error` event. We
 *                     consume via `for await` over the parser's async iterator
 *                     (Node's standard iteration over Readable streams).
 * Segment shape:      `FormattedSegment = { name: string, [k: string]: string }`
 *                     where keys are 1-indexed STRING numerals
 *                     (`seg["1"]`, `seg["2"]`, ...). Composite sub-elements
 *                     use a hyphenated key, e.g. `seg["1-1"]` for SVC01-01.
 *                     There is NO `elements: string[]` array — RESEARCH.md
 *                     pseudocode was incorrect on that point. Use the helper
 *                     `el(seg, "1")` below to read elements safely.
 * Delimiter handling: Auto-detected from the ISA segment by
 *                     `X12parser.detectDelimiters`. Default `*` ~ `:` and
 *                     non-default (e.g., `|` element / `\n` segment) both
 *                     parse correctly without configuration. Verified against
 *                     fixture `non-default-delimiters.835.txt`.
 * Stream tail:        The parser emits a trailing empty segment `{ name: "" }`
 *                     after IEA on some inputs. The `case ''` arm and the
 *                     unknown-segment fall-through skip it.
 *
 * ─── PHI scrub rule (T-3.5-PHI-1) ─────────────────────────────────────────────
 *
 * 835 ERAs contain real PHI in nearly every segment (subscriber IDs in NM1*QC,
 * SSN-shaped numerics in REF segments, account numbers in BPR). Errors thrown
 * by `parse835` MUST NEVER include raw EDI text or any 9+ digit numerical run.
 * The `phiSafeMessage` helper builds the only error string surfaces in this
 * module; any error path that bypasses it is a bug. The PHI scrub regression
 * test in `edi835-mappers.test.ts` enforces this.
 */

import { Readable } from 'node:stream';
import { X12parser, type FormattedSegment } from 'x12-parser';
import { PayerConnectionError } from '../types';
import type {
  Parsed835,
  ParsedClaim,
  ParsedServiceLine,
  ParsedAdjustment,
  ProviderLevelAdjustment,
  PayerInfo,
  PayeeInfo,
  PaymentInfo,
  AdjustmentGroupCode,
} from './edi835-types';

/** 8+ consecutive digits = potential PHI (SSN/DOB/insurance ID/account number). */
const PHI_DIGIT_RUN = /[0-9]{8,}/g;

const VALID_GROUP_CODES: ReadonlySet<AdjustmentGroupCode> = new Set([
  'CO',
  'PR',
  'OA',
  'PI',
]);

function phiSafeMessage(seg: string | null, segIndex: number): string {
  // Segment names are 2-3 letter alpha codes from the X12 dictionary — no PHI.
  const safeName = seg && /^[A-Z0-9]{1,3}$/.test(seg) ? seg : 'unknown segment';
  return `835 parse failed: ${safeName} at offset ${segIndex}`;
}

function scrubPhi(text: string): string {
  return text.replace(PHI_DIGIT_RUN, '[REDACTED]');
}

/** Safe element reader. Returns `''` when the key is missing. */
function el(seg: FormattedSegment, key: string): string {
  const value = seg[key];
  return typeof value === 'string' ? value : '';
}

function toNumber(raw: string): number {
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Normalize EDI date strings to ISO YYYY-MM-DD.
 * Supports CCYYMMDD (8 digits) and YYMMDD (6 digits, century inferred via
 * 50-year rolling window — same convention the X12 5010 IG suggests).
 * Empty / malformed inputs return ''.
 */
function parseEdiDate(raw: string): string {
  if (!raw) return '';
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }
  if (/^\d{6}$/.test(raw)) {
    const yy = Number(raw.slice(0, 2));
    const currentYY = new Date().getUTCFullYear() % 100;
    const century = yy <= currentYY + 50 ? 2000 : 1900;
    return `${century + yy}-${raw.slice(2, 4)}-${raw.slice(4, 6)}`;
  }
  return '';
}

/** SVC01 is "QUAL:CODE" e.g. "AD:D2740". x12-parser already splits composites
 *  into `seg["1"]` (qualifier) and `seg["1-1"]` (code). Fall through to a
 *  manual split if the input wasn't composite-encoded. */
function readSvcCompositeCode(seg: FormattedSegment): {
  qualifier: string;
  code: string;
} {
  const sub1 = el(seg, '1-1');
  if (sub1) {
    return { qualifier: el(seg, '1'), code: sub1 };
  }
  const raw = el(seg, '1');
  const idx = raw.indexOf(':');
  if (idx < 0) return { qualifier: '', code: raw };
  return { qualifier: raw.slice(0, idx), code: raw.slice(idx + 1) };
}

/** PLB03 may be composite "WO:ICN". x12-parser splits as `seg["3"]` reason
 *  + `seg["3-1"]` reference. We surface only the reason code. */
function readPlbReason(seg: FormattedSegment): string {
  const reasonOnly = el(seg, '3');
  if (!reasonOnly.includes(':')) return reasonOnly;
  return reasonOnly.split(':')[0] ?? '';
}

function safeGroupCode(value: string): AdjustmentGroupCode | null {
  return VALID_GROUP_CODES.has(value as AdjustmentGroupCode)
    ? (value as AdjustmentGroupCode)
    : null;
}

/** Walk a CAS segment which can carry up to 6 (groupCode, reasonCode, amount,
 *  quantity?) tuples. The x12-parser exposes them as numbered keys: CAS01 is
 *  the group code, then triplets follow at 02/03/04, 05/06/07, etc. We only
 *  need group/reason/amount — quantity is optional and unused downstream. */
function readCasAdjustments(
  seg: FormattedSegment,
  segIndex: number,
): ParsedAdjustment[] {
  const adjustments: ParsedAdjustment[] = [];
  const group = safeGroupCode(el(seg, '1'));
  if (!group) {
    // Unknown group code — surface as PHI-safe error rather than silently
    // mis-classifying a denial vs patient-resp.
    throw new PayerConnectionError(
      `${phiSafeMessage('CAS', segIndex)} — unknown adjustment group code`,
    );
  }
  // Triplets at positions (2,3,4), (5,6,7), (8,9,10), (11,12,13), (14,15,16),
  // (17,18,19) — but most CAS segments only carry one triplet.
  for (let base = 2; base <= 17; base += 3) {
    const reason = el(seg, String(base));
    const amount = el(seg, String(base + 1));
    if (!reason && !amount) continue;
    adjustments.push({
      groupCode: group,
      reasonCode: reason,
      amount: toNumber(amount),
    });
  }
  return adjustments;
}

/**
 * Parse a raw 835 EDI string into a typed segment tree.
 *
 * @throws {PayerConnectionError} on any structural or stream error. Error
 *   messages are PHI-safe — no raw EDI fragments or 9+ digit numerical runs.
 */
export async function parse835(rawEdi: string): Promise<Parsed835> {
  if (typeof rawEdi !== 'string' || rawEdi.length === 0) {
    throw new PayerConnectionError('835 parse failed: empty input');
  }
  if (!rawEdi.trimStart().startsWith('ISA')) {
    throw new PayerConnectionError('835 parse failed: missing ISA envelope');
  }

  let payer: PayerInfo = { name: '' };
  let payee: PayeeInfo = { name: '' };
  const payment: PaymentInfo = {
    amount: 0,
    method: '',
    checkNumber: '',
    checkDate: '',
  };
  const claims: ParsedClaim[] = [];
  const plbs: ProviderLevelAdjustment[] = [];

  let currentClaim: ParsedClaim | null = null;
  let currentLine: ParsedServiceLine | null = null;
  let segIndex = 0;
  let lastSegName: string | null = null;

  const parser = new X12parser();

  try {
    Readable.from([rawEdi]).pipe(parser);

    for await (const chunk of parser) {
      const seg = chunk as FormattedSegment;
      // Trailing empty segment that the parser emits on some inputs.
      if (!seg.name) continue;
      segIndex++;
      lastSegName = seg.name;

      switch (seg.name) {
        case 'BPR':
          // BPR02 = total monetary amount.
          // BPR04 = payment method (ACH | CHK | NON | ...).
          // BPR16 = effective entry date (CCYYMMDD), normalized to ISO.
          //
          // The "check number" assignment is intentionally NOT BPR05 (which
          // in 5010 X221A1 is the payment format code, e.g. "CCP", not a
          // check identifier). The unique payment identifier in this spec
          // lives in TRN02 (the trace number) — see the TRN case below
          // where it's promoted to `payment.checkNumber` when BPR did not
          // surface a sender-side reference.
          payment.amount = toNumber(el(seg, '2'));
          payment.method = el(seg, '4');
          payment.checkDate = parseEdiDate(el(seg, '16'));
          break;

        case 'TRN': {
          // TRN02 is the payer's trace / reference number. In the X12
          // 5010 X221A1 ERA dialect, this is the unique payment identifier
          // (matches the bank-side EFT). We use it as the canonical
          // `checkNumber` downstream because BPR carries no equivalent
          // field in this spec (see BPR comment above).
          const trace = el(seg, '2');
          payment.traceNumber = trace;
          if (trace && !payment.checkNumber) {
            payment.checkNumber = trace;
          }
          break;
        }

        case 'N1': {
          const qualifier = el(seg, '1');
          if (qualifier === 'PR') {
            payer = { name: el(seg, '2') };
          } else if (qualifier === 'PE') {
            const idQualifier = el(seg, '3');
            payee = {
              name: el(seg, '2'),
              npi: idQualifier === 'XX' ? el(seg, '4') : undefined,
            };
          }
          break;
        }

        case 'CLP': {
          if (currentClaim) claims.push(currentClaim);
          currentLine = null;
          currentClaim = {
            claimPmsId: el(seg, '1'),
            claimStatusCode: el(seg, '2'),
            billed: toNumber(el(seg, '3')),
            paid: toNumber(el(seg, '4')),
            patientResp: toNumber(el(seg, '5')),
            payerClaimControl: el(seg, '7') || undefined,
            serviceLines: [],
            claimLevelAdjustments: [],
          };
          break;
        }

        case 'NM1': {
          if (!currentClaim) break;
          if (el(seg, '1') === 'QC') {
            currentClaim.patientLastName = el(seg, '3');
            currentClaim.patientFirstName = el(seg, '4');
            if (el(seg, '8') === 'MI') {
              currentClaim.patientId = el(seg, '9') || undefined;
            }
          }
          break;
        }

        case 'SVC': {
          if (!currentClaim) break;
          const composite = readSvcCompositeCode(seg);
          const units = el(seg, '5');
          currentLine = {
            procedureCode: composite.code,
            procedureQualifier: composite.qualifier,
            fee: toNumber(el(seg, '2')),
            paid: toNumber(el(seg, '3')),
            units: units ? toNumber(units) : undefined,
            adjustments: [],
          };
          currentClaim.serviceLines.push(currentLine);
          break;
        }

        case 'DTM':
          if (currentLine && el(seg, '1') === '472') {
            currentLine.serviceDate = parseEdiDate(el(seg, '2'));
          }
          break;

        case 'CAS': {
          if (!currentClaim) break;
          const adjustments = readCasAdjustments(seg, segIndex);
          if (currentLine) {
            currentLine.adjustments.push(...adjustments);
          } else {
            currentClaim.claimLevelAdjustments.push(...adjustments);
          }
          break;
        }

        case 'REF': {
          if (currentLine) {
            const qual = el(seg, '1');
            // Dental tooth number qualifiers — populated by some payers per
            // their companion guides. Optional everywhere downstream.
            if (qual === 'TT' || qual === 'TQ') {
              currentLine.toothNumber = el(seg, '2') || undefined;
            }
          }
          break;
        }

        case 'PLB': {
          plbs.push({
            providerId: el(seg, '1'),
            fiscalDate: parseEdiDate(el(seg, '2')),
            reasonCode: readPlbReason(seg),
            amount: toNumber(el(seg, '4')),
          });
          break;
        }

        // Envelope / loop markers — surfaced for completeness, no-op.
        case 'ISA':
        case 'GS':
        case 'ST':
        case 'LX':
        case 'N3':
        case 'N4':
        case 'PER':
        case 'SE':
        case 'GE':
        case 'IEA':
        case 'LQ':
        case 'AMT':
        case 'QTY':
        case 'MIA':
        case 'MOA':
          break;
        default:
          // Unknown segment — ignore silently. Future-spec segments (8020
          // tooth segment, etc.) will land here and not break parsing.
          break;
      }
    }
    if (currentClaim) claims.push(currentClaim);
  } catch (err) {
    if (err instanceof PayerConnectionError) throw err;
    // PHI scrub: any error message bubbling up from x12-parser could
    // contain raw EDI fragments. Strip 8+ digit runs and prepend the
    // structurally-safe envelope. We deliberately do NOT include err.message
    // contents beyond what survives PHI scrub.
    const upstream = err instanceof Error ? scrubPhi(err.message) : 'stream error';
    throw new PayerConnectionError(
      `${phiSafeMessage(lastSegName, segIndex)} — ${upstream}`,
    );
  }

  return {
    payer,
    payee,
    payment,
    claims,
    providerLevelAdjustments: plbs,
  };
}
