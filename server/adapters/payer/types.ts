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

// ─── EOB Types ─────────────────────────────────────────────────────────────

export type EOBSource = 'edi_835' | 'portal_scrape' | 'manual_upload';

export interface RawEOBLineItem {
  patientFirstName: string;
  patientLastName: string;
  patientDob?: string;
  patientPmsId?: string;
  procedureCode: string;
  toothNumber?: string;
  serviceDate: string;
  fee: number;
  allowed: number;
  paid: number;
  adjustment: number;
  patientResponsibility: number;
  denialCode?: string;
  denialReason?: string;
  claimPmsId?: string;
}

export interface RawEOBDocument {
  checkNumber: string;
  checkDate: string;
  checkAmount: number;
  payerName: string;
  receivedDate?: string;
  source: EOBSource;
  lineItems: RawEOBLineItem[];
  rawData?: unknown;
}

// ─── Payer Adapter Interface ────────────────────────────────────────────────

export interface IPayerAdapter {
  readonly payerName: string;
  readonly payerType: 'medicaid' | 'commercial';
  readonly supportedStates?: string[];

  testConnection(): Promise<{ connected: boolean; error?: string }>;

  checkEligibility(request: EligibilityRequest): Promise<EligibilityResult>;

  getHealthStatus(): Promise<{ status: 'healthy' | 'degraded' | 'down'; lastCheck: string }>;

  retrieveEOBs?(params: {
    dateFrom: string;
    dateTo: string;
    clinicNpi: string;
  }): Promise<RawEOBDocument[]>;
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
