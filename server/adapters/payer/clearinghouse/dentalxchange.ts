import type { IPayerAdapter, EligibilityRequest, EligibilityResult } from '../types';

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

// ─── Deterministic Hash for Variety ─────────────────────────────────────────

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// ─── Adapter ────────────────────────────────────────────────────────────────

export class DentalXChangeAdapter implements IPayerAdapter {
  readonly payerName: string;
  readonly payerType = 'commercial' as const;

  constructor(payerName: string) {
    this.payerName = payerName;
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
}
