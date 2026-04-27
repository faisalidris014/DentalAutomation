import type { IPayerAdapter, EligibilityRequest, EligibilityResult, RawEOBDocument } from '../types';
import type { IClearinghouseEOBSource } from './source-types';
import { MockEOBSource } from './dentalxchange-source-mock';
import { RealClearinghouseEOBSource } from './dentalxchange-source-real';
import { simpleHash } from './utils';

// ─── Credentials Shape (RESEARCH.md Pitfall 6) ──────────────────────────────

/**
 * Shape of the decrypted DentalXChange credentials blob held in
 * `payer_configs.credentials`. Two on-disk shapes exist:
 *   - Legacy: a bare encrypted string → after decrypt, treated as
 *     `{ eligibility: { apiKey: <plaintext> } }`.
 *   - New: an encrypted JSON blob → after decrypt + JSON.parse, conforms to
 *     this interface directly.
 *
 * Both shapes are normalized into this interface by
 * `decryptDXCCredentials()` in `payer/registry.ts`.
 */
export interface DXCCredentialsBlob {
  eligibility?: { apiKey: string };
  payment?: { apiKey: string; baseUrl?: string };
}

export interface DentalXChangeAdapterOptions {
  eobMode?: 'mock' | 'sandbox' | 'production';
  credentials?: DXCCredentialsBlob | null;
}

// ─── Benefit Templates Per Carrier ──────────────────────────────────────────

interface BenefitTemplate {
  annualMaximum: number;
  deductible: number;
  coveragePercentages: { preventive: number; basic: number; major: number; ortho: number };
  copays?: { category: string; amount: number }[];
  waitingPeriods?: { category: string; monthsFromService: number }[];
}

const CARRIER_TEMPLATES: Record<string, BenefitTemplate> = {
  'delta dental': {
    annualMaximum: 2000,
    deductible: 50,
    coveragePercentages: { preventive: 100, basic: 80, major: 50, ortho: 0 },
  },
  'metlife': {
    annualMaximum: 1500,
    deductible: 75,
    coveragePercentages: { preventive: 100, basic: 70, major: 50, ortho: 50 },
    waitingPeriods: [{ category: 'major', monthsFromService: 6 }],
  },
  'cigna': {
    annualMaximum: 2500,
    deductible: 100,
    coveragePercentages: { preventive: 100, basic: 80, major: 60, ortho: 50 },
    copays: [
      { category: 'office_visit', amount: 25 },
      { category: 'specialist', amount: 50 },
    ],
  },
};

const DEFAULT_TEMPLATE: BenefitTemplate = {
  annualMaximum: 1000,
  deductible: 50,
  coveragePercentages: { preventive: 100, basic: 80, major: 50, ortho: 0 },
};

// ─── Adapter ────────────────────────────────────────────────────────────────

export class DentalXChangeAdapter implements IPayerAdapter {
  readonly payerName: string;
  readonly payerType = 'commercial' as const;
  private readonly eobSource: IClearinghouseEOBSource;

  constructor(payerName: string, opts?: DentalXChangeAdapterOptions) {
    this.payerName = payerName;
    const mode = this.resolveMode(opts);
    this.eobSource = mode === 'mock'
      ? new MockEOBSource(payerName)
      : new RealClearinghouseEOBSource({
          payerName,
          env: mode,
          credentials: opts?.credentials ?? null,
        });
  }

  /**
   * Resolve the EOB source mode given constructor options + process env.
   *
   * Precedence (per RESEARCH.md §"Mock-vs-real dispatch" + Pitfall 1):
   *   1. `process.env.PAYER_MOCK_MODE === 'true'` → ALWAYS mock (D-015 precedent)
   *   2. credentials missing or `'placeholder'` → mock (warns when production was
   *      explicitly requested but no real credentials are available)
   *   3. explicit `opts.eobMode` → honor it
   *   4. default → 'production' (the dispatcher only reaches this branch when
   *      real credentials are present; safe default is to use them)
   *
   * Note: the `featuresEnabled.eob === false` short-circuit lives in
   * `server/services/eob/engine.ts:54` and runs BEFORE `getPayerAdapter()` is
   * called. The adapter itself does not inspect that flag — by the time we're
   * here, the engine has already decided EOB sync should run.
   */
  private resolveMode(opts?: DentalXChangeAdapterOptions): 'mock' | 'sandbox' | 'production' {
    if (process.env.PAYER_MOCK_MODE === 'true') return 'mock';

    const apiKey = opts?.credentials?.payment?.apiKey ?? opts?.credentials?.eligibility?.apiKey;
    if (!apiKey || apiKey === 'placeholder') {
      if (opts?.eobMode && opts.eobMode !== 'mock') {
        console.warn(
          `[DXC] eobMode=${opts.eobMode} requested but no real credentials available — falling back to mock`,
        );
      }
      return 'mock';
    }

    return opts?.eobMode ?? 'production';
  }

  async testConnection(): Promise<{ connected: boolean; error?: string }> {
    await new Promise((r) => setTimeout(r, 50));
    return { connected: true };
  }

  async getHealthStatus(): Promise<{ status: 'healthy' | 'degraded' | 'down'; lastCheck: string }> {
    return { status: 'healthy', lastCheck: new Date().toISOString() };
  }

  async checkEligibility(request: EligibilityRequest): Promise<EligibilityResult> {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 200));

    const template = CARRIER_TEMPLATES[this.payerName.toLowerCase()] ?? DEFAULT_TEMPLATE;
    const hash = simpleHash(request.subscriberId);

    // Subscriber IDs ending in '01' are inactive (e.g., DD-65120101 = Michael Thompson)
    const isInactive = request.subscriberId.endsWith('01');

    if (isInactive) {
      return {
        status: 'inactive',
        terminationDate: new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0],
        dentalCoverageIncluded: false,
        checkedAt: new Date().toISOString(),
        rawResponse: JSON.stringify({
          transactionId: `271-${Date.now()}`,
          subscriberId: request.subscriberId,
          status: 'inactive',
          carrier: this.payerName,
        }),
      };
    }

    // Vary used amounts deterministically based on subscriber ID
    const usedPercent = (hash % 60) / 100; // 0-59% of max used
    const deductibleMetPercent = (hash % 100) / 100; // 0-99% of deductible met

    const annualMaximumUsed = Math.round(template.annualMaximum * usedPercent * 100) / 100;
    const deductibleMet = Math.round(template.deductible * deductibleMetPercent * 100) / 100;

    // Build waiting periods with concrete dates
    const waitingPeriods = template.waitingPeriods?.map((wp) => {
      const endDate = new Date(request.dateOfService);
      endDate.setMonth(endDate.getMonth() + wp.monthsFromService);
      return { category: wp.category, endDate: endDate.toISOString().split('T')[0] };
    });

    const effectiveDate = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0];

    const result: EligibilityResult = {
      status: 'active',
      effectiveDate,
      dentalCoverageIncluded: true,
      annualMaximum: template.annualMaximum,
      annualMaximumUsed,
      deductible: template.deductible,
      deductibleMet,
      coveragePercentages: template.coveragePercentages,
      copays: template.copays,
      waitingPeriods,
      checkedAt: new Date().toISOString(),
      rawResponse: JSON.stringify({
        transactionId: `271-${Date.now()}`,
        subscriberId: request.subscriberId,
        status: 'active',
        carrier: this.payerName,
        benefits: {
          annualMaximum: template.annualMaximum,
          annualMaximumUsed,
          deductible: template.deductible,
          deductibleMet,
          coveragePercentages: template.coveragePercentages,
        },
      }),
    };

    return result;
  }

  async retrieveEOBs(params: {
    dateFrom: string;
    dateTo: string;
    clinicNpi: string;
  }): Promise<RawEOBDocument[]> {
    return this.eobSource.fetch(params);
  }
}
