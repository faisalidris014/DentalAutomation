export type Role = 'it_admin' | 'staff_admin' | 'staff_user';

export interface Clinic {
  id: string;
  name: string;
  address: string;
  phone: string;
  npi: string;
  agentId: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  clinicId: string;
  avatar?: string;
  initials: string;
}

export interface InsuranceInfo {
  carrierId: string;
  carrierName: string;
  planType: string;
  planName: string;
  subscriberId: string;
  groupNumber: string;
  subscriberName: string;
  relationship: 'self' | 'spouse' | 'child' | 'other';
  effectiveDate: string;
  terminationDate?: string;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'M' | 'F';
  phone: string;
  email: string;
  address: string;
  clinicId: string;
  guarantorId?: string;
  primaryInsurance?: InsuranceInfo;
  secondaryInsurance?: InsuranceInfo;
  balance: number;
  nextAppointment?: string;
  recallStatus: 'current' | 'due' | 'overdue';
  lastVisit: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  clinicId: string;
  date: string;
  time: string;
  duration: number;
  procedureCode: string;
  procedureDescription: string;
  provider: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  fee: number;
}

export interface Recall {
  id: string;
  patientId: string;
  patientName: string;
  clinicId: string;
  recallType: 'Prophy' | 'Perio' | 'Child Prophy' | 'FMX' | 'Pano';
  dueDate: string;
  daysOverdue: number;
  lastReminderDate?: string;
  reminderCount: number;
  contactMethod: 'email' | 'sms' | 'phone' | 'mail';
  status: 'pending' | 'reminder_sent' | 'scheduled' | 'refused';
  phone: string;
  email: string;
}

export interface ClaimLineItem {
  procedureCode: string;
  procedureDescription: string;
  toothNumber?: string;
  surface?: string;
  fee: number;
  allowedAmount?: number;
  paidAmount?: number;
  patientResp?: number;
  adjustmentAmount?: number;
}

export interface Claim {
  id: string;
  patientId: string;
  patientName: string;
  clinicId: string;
  payerId: string;
  payerName: string;
  subscriberId: string;
  provider: string;
  dateOfService: string;
  dateSubmitted: string;
  referenceNumber: string;
  status: 'queued' | 'submitted' | 'processing' | 'approved' | 'denied' | 'partial' | 'paid';
  totalFee: number;
  allowedAmount?: number;
  paidAmount?: number;
  patientResp?: number;
  denialReason?: string;
  denialCode?: string;
  suggestedAction?: string;
  lineItems: ClaimLineItem[];
  timeline: ClaimTimelineEntry[];
}

export interface ClaimTimelineEntry {
  date: string;
  status: string;
  description: string;
}

export interface EOBLineItem {
  procedureCode: string;
  procedureDescription: string;
  toothNumber?: string;
  fee: number;
  allowedAmount: number;
  deductible: number;
  copay: number;
  paidAmount: number;
  patientResp: number;
  adjustmentAmount: number;
  remarkCode?: string;
}

export interface EOB {
  id: string;
  claimId: string;
  patientId: string;
  patientName: string;
  clinicId: string;
  payerId: string;
  payerName: string;
  dateOfService: string;
  dateReceived: string;
  checkNumber: string;
  totalBilled: number;
  totalAllowed: number;
  totalPaid: number;
  totalPatientResp: number;
  totalAdjustment: number;
  lineItems: EOBLineItem[];
  triageStatus: string;
  triageReason: string | null;
  postedToPms: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
}

export interface JobLogEntry {
  timestamp: string;
  step: string;
  status: 'success' | 'info' | 'warning' | 'error';
  message: string;
  duration?: number;
}

export interface Job {
  id: string;
  type: 'eligibility' | 'eob_retrieval' | 'claim_submit' | 'claim_status' | 'recall_reminder' | 'patient_sync';
  patientId?: string;
  patientName?: string;
  clinicId: string;
  payerId?: string;
  payerName?: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  triggeredBy: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  progress?: number;
  errorMessage?: string;
  logs: JobLogEntry[];
}

export interface Notification {
  id: string;
  clinicId: string;
  category: 'failure' | 'denial' | 'action_required' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  dismissed: boolean;
  linkTo?: string;
  relatedId?: string;
}

export interface Payer {
  id: string;
  name: string;
  portalUrl: string;
  status: 'active' | 'beta' | 'coming_soon';
  supportedFeatures: string[];
  lastSync?: string;
}

export interface AgentStatus {
  id: string;
  clinicId: string;
  clinicName: string;
  status: 'online' | 'offline' | 'updating';
  version: string;
  latestVersion: string;
  lastHeartbeat: string;
  jobsInQueue: number;
  jobsCompletedToday: number;
  openDentalConnected: boolean;
  uptime: string;
  logs: AgentLogEntry[];
}

export interface AgentLogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface EligibilityResult {
  patientId: string;
  payerName: string;
  checkedAt: string;
  status: 'active' | 'inactive' | 'unknown';
  effectiveDate: string;
  terminationDate?: string;
  planName: string;
  planType: string;
  deductibleIndividual: number;
  deductibleUsed: number;
  deductibleRemaining: number;
  annualMaximum: number;
  annualMaxUsed: number;
  annualMaxRemaining: number;
  preventiveCoverage: number;
  basicCoverage: number;
  majorCoverage: number;
  orthodonticCoverage: number;
  copayPreventive: number;
  copayBasic: number;
  copayMajor: number;
  waitingPeriods: {
    basic: string;
    major: string;
    orthodontic: string;
  };
  inNetwork: boolean;
  notes?: string;
}

export interface EligibilityCheck {
  id: string;
  patientId: string;
  patientName: string;
  payerName: string;
  checkedAt: string;
  status: 'active' | 'inactive' | 'unknown';
  result: EligibilityResult;
}
