// API response types matching the backend's actual response shapes.
// Kept separate from types/index.ts to avoid breaking mock-only pages.

import type { Role } from './index';

// ─── Response Wrappers ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface SingleResponse<T> {
  data: T;
}

// ─── Auth ──────────────────────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  user: ApiUser & {
    clinic: ApiClinic | null;
  };
}

// ─── User ──────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  clinicId: string | null;
}

// ─── Clinic ────────────────────────────────────────────────────────────────

export interface ApiClinic {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  npi: string | null;
  status: string;
}

// ─── Patient ───────────────────────────────────────────────────────────────

export interface ApiInsurance {
  id: string;
  patientId: string;
  clinicId: string;
  ordinal: number;
  pmsPatplanId: string | null;
  pmsInssubId: string | null;
  pmsInsplanId: string | null;
  pmsCarrierId: string | null;
  carrierName: string | null;
  carrierPhone: string | null;
  carrierElectId: string | null;
  groupName: string | null;
  groupNumber: string | null;
  subscriberId: string | null;
  subscriberName: string | null;
  planType: string | null;
  filingCode: string | null;
  lastVerifiedAt: string | null;
  verificationStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPatient {
  id: string;
  clinicId: string;
  pmsPatientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  gender: string | null;
  phoneHome: string | null;
  phoneCell: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  guarantorId: string | null;
  preferredContact: string | null;
  balance: string | number;
  status: string | null;
  lastSyncedAt: string | null;
  pmsRawData: unknown;
  createdAt: string;
  updatedAt: string;
  // Joined in list endpoint
  primaryInsurance?: ApiInsurance | null;
  // Joined in detail endpoint
  insurance?: ApiInsurance[];
  recentClaims?: ApiClaim[];
}

// ─── Eligibility ───────────────────────────────────────────────────────────

export interface ApiEligibilityCheck {
  id: string;
  clinicId: string;
  patientId: string;
  insuranceId: string | null;
  payerName: string;
  payerType: string;
  adapterUsed: string;
  trigger: string;
  triggeredBy: string | null;
  status: string;
  eligibilityResult: string;
  effectiveDate: string | null;
  terminationDate: string | null;
  managedCarePlan: string | null;
  dentalCoverage: boolean | null;
  resultDetails: Record<string, unknown> | null;
  errorMessage: string | null;
  writtenToPms: boolean;
  pmsWriteResult: string | null;
  durationMs: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  // Joined fields
  patientFirstName?: string;
  patientLastName?: string;
}

export interface ApiEligibilityStats {
  totalChecks: number;
  byStatus: Record<string, number>;
  byPayer: Record<string, number>;
  avgDurationMs: number;
  lastBatchRun: string | null;
}

// ─── Dashboard KPIs ────────────────────────────────────────────────────────

export interface ITAdminKPIs {
  role: 'it_admin';
  totalClinics: number;
  totalPatients: number;
  jobsToday: number;
  failedJobsToday: number;
}

export interface StaffAdminKPIs {
  role: 'staff_admin';
  patientCount: number;
  unverifiedInsurance: number;
  jobsToday: number;
  unreadNotifications: number;
}

export interface StaffUserKPIs {
  role: 'staff_user';
  jobsCompletedToday: number;
  unreadNotifications: number;
}

export type DashboardKPIResponse =
  | { data: ITAdminKPIs }
  | { data: StaffAdminKPIs }
  | { data: StaffUserKPIs }
  | { data: { role: string } };

// ─── Notifications ─────────────────────────────────────────────────────────

export interface ApiNotification {
  id: string;
  clinicId: string | null;
  userId: string | null;
  type: string;
  severity: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  actionUrl: string | null;
  isRead: boolean;
  isDismissed: boolean;
  readAt: string | null;
  targetRoles: string[] | null;
  createdAt: string;
}

// ─── Claims (minimal, for patient detail) ──────────────────────────────────

export interface ApiClaim {
  id: string;
  patientId: string;
  clinicId: string;
  payerName: string | null;
  status: string;
  totalFee: string | number;
  paidAmount: string | number | null;
  dateOfService: string | null;
  dateSubmitted: string | null;
  createdAt: string;
}
