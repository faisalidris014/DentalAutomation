import { describe, it, expect, vi, afterEach } from 'vitest';
import { DentalXChangeAdapter } from './dentalxchange';
import { getPayerAdapter } from '../registry';
import { PayerConnectionError } from '../types';

// Mock the AES-256-GCM module so tests don't need a real
// CREDENTIAL_ENCRYPTION_KEY. The fake format is `mock:tag:<base64-payload>`,
// which `tryDecrypt` in registry.ts treats as "looks encrypted" (contains
// `:`) and routes through this stub.
vi.mock('../../../services/encryption/credentials', () => ({
  encrypt: (s: string) => `mock:tag:${Buffer.from(s).toString('base64')}`,
  decrypt: (s: string) => {
    const parts = s.split(':');
    return Buffer.from(parts[2] ?? '', 'base64').toString('utf8');
  },
}));

const SYNC_PARAMS = {
  dateFrom: '2026-04-01',
  dateTo: '2026-04-26',
  clinicNpi: '1234567890',
};

describe('DentalXChangeAdapter — mock-vs-real dispatch', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('defaults to mock with no credentials', async () => {
    const adapter = new DentalXChangeAdapter('Delta Dental');
    const eobs = await adapter.retrieveEOBs(SYNC_PARAMS);
    expect(eobs.length).toBeGreaterThan(0);
    expect(eobs[0]).toHaveProperty('checkNumber');
    expect(eobs[0]).toHaveProperty('lineItems');
    expect(Array.isArray(eobs[0].lineItems)).toBe(true);
  });

  it('PAYER_MOCK_MODE=true forces mock even when production requested', async () => {
    vi.stubEnv('PAYER_MOCK_MODE', 'true');
    const adapter = new DentalXChangeAdapter('Delta Dental', {
      eobMode: 'production',
      credentials: { payment: { apiKey: 'real-key' } },
    });
    // Should NOT throw — kill switch wins, mock source is used.
    const eobs = await adapter.retrieveEOBs(SYNC_PARAMS);
    expect(eobs.length).toBeGreaterThan(0);
  });

  it('production requires credentials — falls back to mock when missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = new DentalXChangeAdapter('Delta Dental', {
      eobMode: 'production',
      credentials: null,
    });
    const eobs = await adapter.retrieveEOBs(SYNC_PARAMS);
    expect(eobs.length).toBeGreaterThan(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('falling back to mock'),
    );
  });

  it('placeholder apiKey falls back to mock', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = new DentalXChangeAdapter('Delta Dental', {
      eobMode: 'production',
      credentials: { payment: { apiKey: 'placeholder' } },
    });
    // Should NOT throw — placeholder counts as "no real creds".
    const eobs = await adapter.retrieveEOBs(SYNC_PARAMS);
    expect(eobs.length).toBeGreaterThan(0);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('falling back to mock'),
    );
  });

  it('production with real credentials uses RealClearinghouseEOBSource (Wave 2 stub throws)', async () => {
    const adapter = new DentalXChangeAdapter('Delta Dental', {
      eobMode: 'production',
      credentials: { payment: { apiKey: 'real-key' } },
    });
    await expect(adapter.retrieveEOBs(SYNC_PARAMS)).rejects.toThrow(PayerConnectionError);
    await expect(adapter.retrieveEOBs(SYNC_PARAMS)).rejects.toThrow(
      /not implemented yet|env=production/,
    );
  });

  it('sandbox mode with credentials uses real source with env=sandbox', async () => {
    const adapter = new DentalXChangeAdapter('Delta Dental', {
      eobMode: 'sandbox',
      credentials: { payment: { apiKey: 'real-key' } },
    });
    await expect(adapter.retrieveEOBs(SYNC_PARAMS)).rejects.toThrow(/env=sandbox/);
  });

  it('checkEligibility behavior unchanged: subscriber id ending in 01 returns inactive', async () => {
    const adapter = new DentalXChangeAdapter('Delta Dental');
    const result = await adapter.checkEligibility({
      subscriberId: 'DD-65120101',
      firstName: 'Michael',
      lastName: 'Thompson',
      dateOfBirth: '1980-01-01',
      providerNpi: '1234567890',
      dateOfService: '2026-04-26',
    });
    expect(result.status).toBe('inactive');
  });
});

describe('getPayerAdapter — registry feature-flag wiring', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('reads featuresEnabled.eobMode from payer_configs row', async () => {
    const adapter = getPayerAdapter({
      adapterKey: 'clearinghouse.dentalxchange',
      payerName: 'Delta Dental',
      // legacy-shape encrypted blob → decrypts to 'placeholder' → mock
      credentials: 'mock:tag:' + Buffer.from('placeholder').toString('base64'),
      featuresEnabled: { eob: true, eobMode: 'mock' },
    });
    const eobs = await adapter.retrieveEOBs!(SYNC_PARAMS);
    expect(eobs.length).toBeGreaterThan(0); // mock source returned data
  });

  it('decryptDXCCredentials handles legacy string shape', async () => {
    const adapter = getPayerAdapter({
      adapterKey: 'clearinghouse.dentalxchange',
      payerName: 'Delta Dental',
      // legacy bare-string credential, encrypted; decrypts to a non-placeholder
      // plaintext API key, which counts as "real creds present" → real source.
      credentials: 'mock:tag:' + Buffer.from('legacy-api-key').toString('base64'),
      featuresEnabled: { eob: true, eobMode: 'production' },
    });
    await expect(adapter.retrieveEOBs!(SYNC_PARAMS)).rejects.toThrow(PayerConnectionError);
  });

  it('decryptDXCCredentials handles new JSON shape', async () => {
    const blob = JSON.stringify({ payment: { apiKey: 'real-key' } });
    const adapter = getPayerAdapter({
      adapterKey: 'clearinghouse.dentalxchange',
      payerName: 'Delta Dental',
      credentials: 'mock:tag:' + Buffer.from(blob).toString('base64'),
      featuresEnabled: { eob: true, eobMode: 'production' },
    });
    await expect(adapter.retrieveEOBs!(SYNC_PARAMS)).rejects.toThrow(PayerConnectionError);
  });
});

describe('feature-flag precedence (RESEARCH.md Pitfall 1)', () => {
  it('eob: false short-circuit lives in engine.ts, NOT in adapter — adapter still constructs cleanly', () => {
    // This test documents the precedence rule: featuresEnabled.eob === false
    // is checked at the engine (server/services/eob/engine.ts:54) BEFORE
    // getPayerAdapter is called. The adapter itself does NOT inspect the
    // `eob` boolean — that's the engine's job. Engine-side coverage of the
    // skip behavior lives in plan 03.5-05.
    const adapter = getPayerAdapter({
      adapterKey: 'clearinghouse.dentalxchange',
      payerName: 'Delta Dental',
      credentials: null,
      featuresEnabled: { eob: false, eobMode: 'production' },
    });
    expect(adapter).toBeDefined();
    expect(adapter.payerName).toBe('Delta Dental');
  });
});
