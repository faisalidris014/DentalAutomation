// ─── Canonical Data Models ───────────────────────────────────────────────────
// DentalFlow's internal representations. Every PMS adapter maps its native
// data into these shapes.

export interface CanonicalPatient {
  pmsId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: 'M' | 'F' | 'Other' | 'Unknown';
  phoneHome?: string;
  phoneCell?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  guarantorPmsId?: string;
  preferredContact?: string;
  balance?: number;
  status: 'active' | 'inactive' | 'archived';
}

export interface CanonicalAppointment {
  pmsId: string;
  patientPmsId: string;
  dateTime: string;
  duration: number;
  status: 'scheduled' | 'confirmed' | 'checked_in' | 'in_progress' | 'completed' | 'broken' | 'cancelled';
  provider: string;
  operatory?: string;
  procedures?: string[];
  notes?: string;
}

export interface CanonicalInsurancePlan {
  patientPmsId: string;
  ordinal: number;
  patPlanPmsId: string;
  insSubPmsId: string;
  insPlanPmsId: string;
  carrierPmsId: string;
  carrierName: string;
  carrierPhone?: string;
  carrierElectId?: string;
  groupName?: string;
  groupNumber?: string;
  subscriberId: string;
  subscriberName?: string;
  planType?: string;
  filingCode?: string;
}

export interface CanonicalVerificationStatus {
  patPlanPmsId: string;
  verifyType: 'patient_enrollment' | 'insurance_benefit';
  lastVerifiedDate?: string;
  verifyNote?: string;
}

export interface CanonicalClaim {
  pmsId: string;
  patientPmsId: string;
  carrierName: string;
  claimType: string;
  status: string;
  amountBilled: number;
  amountPaid: number;
  dateSubmitted?: string;
  dateReceived?: string;
  procedures: {
    code: string;
    toothNum?: string;
    fee: number;
    allowed?: number;
    paid?: number;
    status: string;
  }[];
}

// ─── Sync Result ─────────────────────────────────────────────────────────────

export interface SyncResult<T> {
  items: T[];
  totalCount: number;
  hasMore: boolean;
  syncTimestamp: string;
}

// ─── Write Results ───────────────────────────────────────────────────────────

export interface WriteResult {
  success: boolean;
  pmsRecordId?: string;
  error?: string;
}

// ─── The Adapter Interface ───────────────────────────────────────────────────

export interface IPMSAdapter {
  readonly pmsType: string;

  testConnection(): Promise<{ connected: boolean; version?: string; error?: string }>;

  getPatients(params: {
    modifiedSince?: string;
    limit?: number;
    offset?: number;
  }): Promise<SyncResult<CanonicalPatient>>;

  getPatientById(pmsPatientId: string): Promise<CanonicalPatient | null>;

  getAppointments(params: {
    dateFrom: string;
    dateTo: string;
    status?: string;
    modifiedSince?: string;
    limit?: number;
    offset?: number;
  }): Promise<SyncResult<CanonicalAppointment>>;

  getInsurancePlans(patientPmsId: string): Promise<CanonicalInsurancePlan[]>;
  getVerificationStatus(patPlanPmsId: string): Promise<CanonicalVerificationStatus | null>;

  writeVerificationResult(params: {
    patPlanPmsId: string;
    verifyDate: string;
    verifyNote?: string;
    verifiedBy?: string;
  }): Promise<WriteResult>;

  getClaims(params: {
    patientPmsId?: string;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
    modifiedSince?: string;
    limit?: number;
    offset?: number;
  }): Promise<SyncResult<CanonicalClaim>>;

  postInsurancePayment(params: {
    checkNumber: string;
    checkDate: string;
    checkAmount: number;
    carrierName: string;
    lineItems: {
      claimPmsId: string;
      procedureCode: string;
      amountPaid: number;
      amountAllowed: number;
      adjustment: number;
      patientResponsibility: number;
      denialCode?: string;
    }[];
  }): Promise<WriteResult>;

  parseWebhookPayload(rawPayload: unknown): {
    eventType: string;
    entityType: string;
    entityId: string;
    timestamp: string;
    data: unknown;
  };
}

// ─── Errors ──────────────────────────────────────────────────────────────────

export class PMSNotSupportedError extends Error {
  constructor(pmsType: string) {
    super(`PMS type "${pmsType}" is not supported`);
    this.name = 'PMSNotSupportedError';
  }
}

export class PMSConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PMSConnectionError';
  }
}
