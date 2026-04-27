import type { RawEOBDocument } from '../types';

/**
 * Internal contract for an EOB-source strategy used by `DentalXChangeAdapter`.
 *
 * The adapter holds an `IClearinghouseEOBSource` instance and delegates
 * `retrieveEOBs` to it. Two implementations live in this directory:
 *   - `MockEOBSource` (dentalxchange-source-mock.ts) — deterministic generator
 *     for dev/local/demo. Behavior preserved verbatim from the pre-Phase-3.5
 *     `DentalXChangeAdapter.retrieveEOBs` body.
 *   - `RealClearinghouseEOBSource` (dentalxchange-source-real.ts) — Wave 2
 *     stub today, full HTTP client + 835 parser orchestration in plan 03.5-04.
 *
 * This interface is intentionally NOT exported from `payer/types.ts` — that
 * file holds the public `IPayerAdapter` contract; this is internal to the
 * clearinghouse folder so callers always go through the adapter.
 */
export interface IClearinghouseEOBSource {
  fetch(params: {
    dateFrom: string;
    dateTo: string;
    clinicNpi: string;
  }): Promise<RawEOBDocument[]>;
}
