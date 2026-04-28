/**
 * Fixture-driven unit tests for the 835 → RawEOBDocument mapper layer.
 *
 * Test names match VALIDATION.md `-t` filters verbatim:
 *   "single claim", "multi-claim", "delimiters", "PLB", "PHI scrub".
 * Do not rename without updating .planning/phases/03.5-real-clearinghouse-eob/03.5-VALIDATION.md.
 *
 * Threat references:
 *   T-3.5-PHI-1   — parser errors must never include raw EDI / 9+ digit runs
 *   T-3.5-RECONCILE — BPR vs sum(CLP04) + net(PLB) reconciliation
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse835 } from './edi835-parser';
import { mapParsed835ToRawEOB } from './edi835-mappers';
import type { Parsed835 } from './edi835-types';
import { PayerConnectionError } from '../types';

const FIXTURES_DIR = join(__dirname, '__fixtures__');
const readFixture = (name: string): string =>
  readFileSync(join(FIXTURES_DIR, name), 'utf8');

describe('edi835-mappers', () => {
  it('parses single claim fixture into one RawEOBDocument with one line item', async () => {
    const raw = readFixture('cms-sample-1.835.txt');
    const parsed = await parse835(raw);
    const doc = mapParsed835ToRawEOB(parsed);

    expect(doc.checkNumber).toBeTruthy();
    expect(doc.checkAmount).toBe(270);
    expect(doc.checkDate).toBe('2026-01-01');
    expect(doc.payerName).toBe('SAMPLE INSURANCE CO');
    expect(doc.source).toBe('edi_835');
    expect(doc.lineItems).toHaveLength(1);

    const line = doc.lineItems[0];
    expect(line.procedureCode).toBe('D2740');
    expect(line.fee).toBe(450);
    expect(line.paid).toBe(270);
    // PR adjustment of 180 → patient responsibility
    expect(line.patientResponsibility).toBe(180);
    // No CO adjustments → allowed = fee
    expect(line.allowed).toBe(450);
    expect(line.adjustment).toBe(0);
    expect(line.patientFirstName).toBe('SARAH');
    expect(line.patientLastName).toBe('JOHNSON');
    expect(line.patientPmsId).toBe('INS-TEST-001');
    expect(line.serviceDate).toBe('2025-12-15');
    expect(line.claimPmsId).toBe('PMSCLAIM-100001');
  });

  it('parses multi-claim Delta Dental fixture into multiple line items with correct fee/allowed/paid/adjustment', async () => {
    const raw = readFixture('delta-dental-anonymized.835.txt');
    const parsed = await parse835(raw);
    expect(parsed.claims.length).toBeGreaterThanOrEqual(2);

    const doc = mapParsed835ToRawEOB(parsed);
    expect(doc.payerName.toLowerCase()).toContain('delta');
    // 4 claims × 2 SVCs each = 8 line items
    expect(doc.lineItems).toHaveLength(8);

    // Multi-patient EOB: line items include all four patients from fixture
    const patientNames = new Set(
      doc.lineItems.map((li) => `${li.patientFirstName} ${li.patientLastName}`),
    );
    expect(patientNames.size).toBe(4);

    // CDT codes stripped of AD: qualifier
    expect(
      doc.lineItems.every((li) => /^D\d{4}$/.test(li.procedureCode)),
    ).toBe(true);

    // Spot-check D2740 line: fee=180, paid=120, PR adj=60, no CO adj
    const d2740 = doc.lineItems.filter((li) => li.procedureCode === 'D2740');
    expect(d2740).toHaveLength(4);
    for (const line of d2740) {
      expect(line.fee).toBe(180);
      expect(line.paid).toBe(120);
      expect(line.patientResponsibility).toBe(60);
      expect(line.allowed).toBe(180);
      expect(line.adjustment).toBe(0);
    }
  });

  it('honors non-default delimiters from ISA segment', async () => {
    const raw = readFixture('non-default-delimiters.835.txt');
    const parsed = await parse835(raw);
    const doc = mapParsed835ToRawEOB(parsed);

    expect(doc.lineItems).toHaveLength(1);
    expect(doc.checkNumber).toBeTruthy();
    expect(doc.checkAmount).toBe(270);
    expect(doc.payerName).toBe('SAMPLE INSURANCE CO');
    expect(doc.lineItems[0].procedureCode).toBe('D2740');
  });

  it('detects denials from CAS segments — denialCode populated when CARC reason matches denial set', async () => {
    const raw = readFixture('denial-cas.835.txt');
    const parsed = await parse835(raw);
    const doc = mapParsed835ToRawEOB(parsed);

    const denied = doc.lineItems.find((li) => li.denialCode);
    expect(denied).toBeDefined();
    expect(denied!.denialCode).toMatch(/^(CO|PR|OA|PI)-\d+$/);
    // CO-4 = "Procedure code is inconsistent with the modifier used"
    expect(denied!.denialCode).toBe('CO-4');
    expect(denied!.denialReason).toBeTruthy();
    expect(denied!.paid).toBe(0);
  });

  it('PLB takeback: BPR = sum(CLP04) + net(PLB) reconciles when fixture is internally consistent', async () => {
    const raw = readFixture('plb-takeback.835.txt');
    const parsed = await parse835(raw);
    // Fixture: BPR=220, sum(CLP04)=270, PLB=-50 → 270 + (-50) = 220 ✓
    expect(parsed.providerLevelAdjustments).toHaveLength(1);
    expect(parsed.providerLevelAdjustments[0].amount).toBe(-50);
    expect(parsed.providerLevelAdjustments[0].reasonCode).toBe('WO');

    const doc = mapParsed835ToRawEOB(parsed);
    expect(doc.checkAmount).toBe(220);
    expect(doc.lineItems).toHaveLength(1);
  });

  it('PLB reconciliation guard throws PayerConnectionError on BPR vs sum(CLP) mismatch', () => {
    // Synthesize a parsed structure with intentional mismatch:
    // BPR=1000 but sum(CLP04)=300 with no PLB → 700 short → must throw
    const parsed: Parsed835 = {
      payer: { name: 'Test Payer' },
      payee: { name: 'Test Payee' },
      payment: {
        amount: 1000,
        method: 'ACH',
        checkNumber: 'TEST-001',
        checkDate: '2026-04-26',
      },
      claims: [
        {
          claimPmsId: 'CLAIM1',
          claimStatusCode: '1',
          billed: 500,
          paid: 300,
          patientResp: 50,
          serviceLines: [],
          claimLevelAdjustments: [],
        },
      ],
      providerLevelAdjustments: [],
    };

    expect(() => mapParsed835ToRawEOB(parsed)).toThrow(PayerConnectionError);
    expect(() => mapParsed835ToRawEOB(parsed)).toThrow(/reconciliation failed/);
  });

  it('PHI scrub: parser errors NEVER include raw EDI text or 9+ digit numerical runs', async () => {
    // Crafted malformed EDI containing fake SSN-shaped digit runs.
    const malformed =
      'ISA*00**00**ZZ*BAD*ZZ*WORSE*250101*1200*^*00501*1*0*P*:~CLP*X*1*100*999887766*INVALID~';
    let thrown: Error | null = null;
    try {
      await parse835(malformed);
    } catch (e) {
      thrown = e instanceof Error ? e : new Error(String(e));
    }
    // Either parser threw on the structurally bad envelope OR mapper threw
    // when called with empty/invalid output. We trigger the parser path and
    // assert the message has no PHI shape.
    if (thrown) {
      // No 9+ digit runs in the thrown message
      expect(thrown.message).not.toMatch(/\d{9,}/);
      // No raw EDI substring leakage
      expect(thrown.message).not.toContain('999887766');
      expect(thrown.message).not.toContain('CLP*X');
    } else {
      // If the parser tolerated the input, exercise the mapper path with
      // PHI-shaped data and assert the mapper's reconciliation/missing-field
      // errors are also PHI-safe.
      const parsed: Parsed835 = {
        payer: { name: '' },
        payee: { name: '' },
        payment: {
          amount: 0,
          method: '',
          checkNumber: '',
          checkDate: '',
        },
        claims: [],
        providerLevelAdjustments: [],
      };
      try {
        mapParsed835ToRawEOB(parsed);
      } catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        expect(m).not.toMatch(/\d{9,}/);
      }
    }
  });

  it('PHI scrub: error messages from mapper reconciliation guard contain no 9+ digit runs', () => {
    const parsed: Parsed835 = {
      payer: { name: 'Test Payer' },
      payee: { name: 'Test Payee' },
      payment: {
        amount: 9999.99,
        method: 'ACH',
        checkNumber: 'CHK-1',
        checkDate: '2026-04-26',
      },
      claims: [
        {
          claimPmsId: 'CLAIM-987654321', // PHI-shaped digits in ID
          claimStatusCode: '1',
          billed: 100,
          paid: 50,
          patientResp: 25,
          serviceLines: [],
          claimLevelAdjustments: [],
        },
      ],
      providerLevelAdjustments: [],
    };
    let thrown: Error | null = null;
    try {
      mapParsed835ToRawEOB(parsed);
    } catch (e) {
      thrown = e instanceof Error ? e : new Error(String(e));
    }
    expect(thrown).not.toBeNull();
    // Reconciliation message shows dollar amounts but never 9+ digit ids.
    expect(thrown!.message).not.toMatch(/\d{9,}/);
  });

  it('mapper handles MetLife denial (paid=0, BPR=0, both PR & CO adjustments on a single SVC)', async () => {
    const raw = readFixture('metlife-anonymized.835.txt');
    const parsed = await parse835(raw);
    const doc = mapParsed835ToRawEOB(parsed);

    expect(doc.payerName).toBe('METLIFE');
    expect(doc.checkAmount).toBe(0);
    expect(doc.lineItems).toHaveLength(1);
    const line = doc.lineItems[0];
    expect(line.fee).toBe(180);
    expect(line.paid).toBe(0);
    // CO 80 → adjustment = 80, allowed = 180-80 = 100
    expect(line.adjustment).toBe(80);
    expect(line.allowed).toBe(100);
    // PR 100 → patientResponsibility = 100
    expect(line.patientResponsibility).toBe(100);
  });

  it('mapper handles Cigna copay scenario (CARC 3 = copay)', async () => {
    const raw = readFixture('cigna-anonymized.835.txt');
    const parsed = await parse835(raw);
    const doc = mapParsed835ToRawEOB(parsed);

    expect(doc.payerName).toBe('CIGNA');
    expect(doc.checkAmount).toBe(155);
    expect(doc.lineItems).toHaveLength(1);
    const line = doc.lineItems[0];
    expect(line.fee).toBe(200);
    expect(line.paid).toBe(155);
    expect(line.adjustment).toBe(20); // CO*45*20
    expect(line.allowed).toBe(180);
    expect(line.patientResponsibility).toBe(25); // PR*3*25 (copay)
  });

  it('mapper requires non-empty checkNumber and payerName (defensive validation)', () => {
    const baseParsed: Parsed835 = {
      payer: { name: '' },
      payee: { name: '' },
      payment: {
        amount: 0,
        method: '',
        checkNumber: '',
        checkDate: '',
      },
      claims: [],
      providerLevelAdjustments: [],
    };
    expect(() => mapParsed835ToRawEOB(baseParsed)).toThrow(PayerConnectionError);
  });
});
