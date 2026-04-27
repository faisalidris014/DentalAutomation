import type { IClearinghouseEOBSource } from './source-types';
import type { RawEOBDocument } from '../types';
import { simpleHash } from './utils';

/**
 * Mock EOB source — deterministic 835 generator for dev / local / demo.
 *
 * Body is a verbatim extraction of the pre-Phase-3.5 `DentalXChangeAdapter.retrieveEOBs`
 * implementation (was at `dentalxchange.ts:142–219`). Outputs MUST remain
 * byte-identical for identical inputs — the Ilyas demo and Phase 4 UI
 * snapshots depend on this generator's exact shape. Do NOT refactor the
 * loop bodies, magic-number procedure list, or rounding; the only added
 * behavior over the original is the trailing `[PAYER-MOCK]` log line per
 * PATTERNS.md §"Logging Convention".
 */
export class MockEOBSource implements IClearinghouseEOBSource {
  constructor(private readonly payerName: string) {}

  async fetch(params: {
    dateFrom: string;
    dateTo: string;
    clinicNpi: string;
  }): Promise<RawEOBDocument[]> {
    // MOCK: deterministic 835 EDI generator for the demo prototype.
    // Replace with the real DentalXChange 835 remittance API for production.
    // See docs/adapters.md for the IPayerAdapter contract this satisfies.
    await new Promise((r) => setTimeout(r, 300));

    const carrierName = this.payerName;
    const hash = simpleHash(`${carrierName}-${params.dateFrom}-${params.clinicNpi}`);

    // Generate deterministic but varied EOB documents
    const eobCount = 1 + (hash % 4); // 1-4 EOBs per retrieval
    const documents: RawEOBDocument[] = [];

    for (let i = 0; i < eobCount; i++) {
      const itemHash = simpleHash(`${hash}-${i}`);
      const lineItemCount = 1 + (itemHash % 3); // 1-3 line items per EOB
      const checkDate = params.dateFrom;
      const lineItems = [];

      let checkTotal = 0;

      for (let j = 0; j < lineItemCount; j++) {
        const ljHash = simpleHash(`${itemHash}-line-${j}`);
        const procedures = ['D0120', 'D0274', 'D1110', 'D2392', 'D2740', 'D7140'];
        const procCode = procedures[ljHash % procedures.length];
        const fee = 50 + (ljHash % 500);
        const coveragePercent = procCode.startsWith('D01') ? 100
          : procCode.startsWith('D11') ? 80
          : procCode.startsWith('D2') ? 50
          : 80;
        const allowed = Math.round(fee * 0.85 * 100) / 100;
        const paid = Math.round(allowed * (coveragePercent / 100) * 100) / 100;
        const adjustment = Math.round((fee - allowed) * 100) / 100;
        const patientResp = Math.round((allowed - paid) * 100) / 100;

        // ~10% chance of denial
        const hasDenial = ljHash % 10 === 0;

        checkTotal += paid;

        lineItems.push({
          patientFirstName: ['Sarah', 'Michael', 'James', 'Emily', 'Robert'][ljHash % 5],
          patientLastName: ['Johnson', 'Thompson', 'Davis', 'Martinez', 'Wilson'][ljHash % 5],
          patientDob: `198${ljHash % 10}-0${1 + (ljHash % 9)}-${10 + (ljHash % 19)}`,
          procedureCode: procCode,
          serviceDate: params.dateFrom,
          fee,
          allowed: hasDenial ? 0 : allowed,
          paid: hasDenial ? 0 : paid,
          adjustment: hasDenial ? fee : adjustment,
          patientResponsibility: hasDenial ? 0 : patientResp,
          denialCode: hasDenial ? 'CO-4' : undefined,
          denialReason: hasDenial ? 'Procedure code inconsistent with modifier' : undefined,
        });
      }

      documents.push({
        checkNumber: `${carrierName.substring(0, 3).toUpperCase()}-${100000 + itemHash % 900000}`,
        checkDate,
        checkAmount: Math.round(checkTotal * 100) / 100,
        payerName: carrierName,
        receivedDate: new Date().toISOString().split('T')[0],
        source: 'edi_835',
        lineItems,
        rawData: {
          transactionId: `835-${Date.now()}-${i}`,
          carrier: carrierName,
          npi: params.clinicNpi,
        },
      });
    }

    console.log(
      `[PAYER-MOCK] DentalXChange.retrieveEOBs short-circuited — payer=${this.payerName} count=${documents.length}`,
    );
    return documents;
  }
}
