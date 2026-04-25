// ─── Eligibility Request ───────────��────────────────────────────────────────

export interface EligibilityRequest {
  subscriberId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;              // ISO date
  providerNpi: string;
  dateOfService: string;            // ISO date
  alternateIds?: string[];          // fallback IDs if primary lookup fails
}

// ─── Eligibility Result ─────────────────────────────────────────────────────

export interface EligibilityResult {
  status: 'active' | 'inactive' | 'pending' | 'unknown';
  effectiveDate?: string;            // ISO date
  terminationDate?: string;          // ISO date
  managedCarePlan?: string;
  dentalCoverageIncluded: boolean;
  // Commercial benefits
  annualMaximum?: number;
  annualMaximumUsed?: number;
  deductible?: number;
  deductibleMet?: number;
  coveragePercentages?: {
    preventive?: number;              // e.g., 100
    basic?: number;                   // e.g., 80
    major?: number;                   // e.g., 50
    ortho?: number;                   // e.g., 0
  };
  copays?: { category: string; amount: number }[];
  waitingPeriods?: { category: string; endDate: string }[];
  // Metadata
  checkedAt: string;                  // ISO datetime
  rawResponse?: string;               // for audit trail
  errorMessage?: string;
}

// ─── Payer Adapter Interface ───────────��────────────────────────────────────

export interface IPayerAdapter {
  readonly payerName: string;
  readonly payerType: 'medicaid' | 'commercial';
  readonly supportedStates?: string[];

  testConnection(): Promise<{ connected: boolean; error?: string }>;

  checkEligibility(request: EligibilityRequest): Promise<EligibilityResult>;

  getHealthStatus(): Promise<{ status: 'healthy' | 'degraded' | 'down'; lastCheck: string }>;
}

// ─── Errors ────��────────────────────────────────────────────────────────────

export class PayerNotSupportedError extends Error {
  constructor(adapterKey: string) {
    super(`Payer adapter "${adapterKey}" is not supported`);
    this.name = 'PayerNotSupportedError';
  }
}

export class PayerConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PayerConnectionError';
  }
}
