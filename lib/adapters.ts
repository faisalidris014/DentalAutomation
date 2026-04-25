// Maps backend API response shapes to existing frontend types.
// Keeps page components clean — they continue using the same types as before.

import { getInitials } from './formatters';
import type {
  User,
  Clinic,
  Patient,
  InsuranceInfo,
  Notification,
  Claim,
  ClaimLineItem,
  EOB,
  EOBLineItem,
  Recall,
  Job,
  JobLogEntry,
  AgentStatus,
  Role,
} from '@/types';
import type {
  ApiUser,
  ApiClinic,
  ApiPatient,
  ApiInsurance,
  ApiNotification,
  ApiClaim,
  ApiEob,
  ApiRecall,
  ApiJob,
  ApiAgent,
} from '@/types/api';

// ─── User ──────────────────────────────────────────────────────────────────

export function mapApiUserToUser(api: ApiUser): User {
  const name = `${api.firstName} ${api.lastName}`;
  return {
    id: api.id,
    name,
    email: api.email,
    role: api.role as Role,
    clinicId: api.clinicId ?? '',
    initials: getInitials(name),
  };
}

// ─── Clinic ────────────────────────────────────────────────────────────────

export function mapApiClinicToClinic(api: ApiClinic): Clinic {
  const parts = [api.address, api.city, api.state ? `${api.state} ${api.zip ?? ''}`.trim() : null]
    .filter(Boolean);
  return {
    id: api.id,
    name: api.name,
    address: parts.join(', ') || '',
    phone: api.phone ?? '',
    npi: api.npi ?? '',
    agentId: '',
    status: api.status as 'active' | 'inactive',
    createdAt: '',
  };
}

// ─── Insurance ─────────────────────────────────────────────────────────────

export function mapApiInsuranceToInfo(api: ApiInsurance): InsuranceInfo {
  return {
    carrierId: api.pmsCarrierId ?? api.id,
    carrierName: api.carrierName ?? 'Unknown',
    planType: api.planType ?? '',
    planName: api.groupName ?? '',
    subscriberId: api.subscriberId ?? '',
    groupNumber: api.groupNumber ?? '',
    subscriberName: api.subscriberName ?? '',
    relationship: 'self',
    effectiveDate: '',
    terminationDate: undefined,
  };
}

// ─── Patient ───────────────────────────────────────────────────────────────

export function mapApiPatientToPatient(api: ApiPatient): Patient {
  const addressParts = [api.address, api.city, api.state ? `${api.state} ${api.zip ?? ''}`.trim() : null]
    .filter(Boolean);

  return {
    id: api.id,
    firstName: api.firstName,
    lastName: api.lastName,
    dob: api.dateOfBirth ?? '',
    gender: (api.gender as 'M' | 'F') ?? 'M',
    phone: api.phoneCell ?? api.phoneHome ?? '',
    email: api.email ?? '',
    address: addressParts.join(', ') || '',
    clinicId: api.clinicId,
    guarantorId: api.guarantorId ?? undefined,
    primaryInsurance: api.primaryInsurance
      ? mapApiInsuranceToInfo(api.primaryInsurance)
      : undefined,
    balance: typeof api.balance === 'string' ? parseFloat(api.balance) : (api.balance ?? 0),
    recallStatus: 'current',
    lastVisit: api.updatedAt ?? '',
  };
}

// ─── Notification ──────────────────────────────────────────────────────────

const severityToCategoryMap: Record<string, Notification['category']> = {
  error: 'failure',
  warning: 'denial',
  info: 'info',
  success: 'success',
  action_required: 'action_required',
};

export function mapApiNotificationToNotification(api: ApiNotification): Notification {
  return {
    id: api.id,
    clinicId: api.clinicId ?? '',
    category: severityToCategoryMap[api.severity] ?? 'info',
    title: api.title,
    message: api.message,
    timestamp: api.createdAt,
    read: api.isRead,
    dismissed: api.isDismissed,
    linkTo: api.actionUrl ?? undefined,
    relatedId: api.relatedEntityId ?? undefined,
  };
}

// ─── Claim ────────────────────────────────────────────────────────────────

function toNum(val: string | number | null | undefined): number {
  if (val == null) return 0;
  return typeof val === 'string' ? parseFloat(val) || 0 : val;
}

export function mapApiClaimToClaim(api: ApiClaim): Claim {
  const procedures = Array.isArray(api.procedures) ? api.procedures : [];
  const lineItems: ClaimLineItem[] = procedures.map((p: Record<string, unknown>) => ({
    procedureCode: String(p.procedureCode ?? p.code ?? ''),
    procedureDescription: String(p.procedureDescription ?? p.description ?? ''),
    toothNumber: p.toothNumber ? String(p.toothNumber) : undefined,
    surface: p.surface ? String(p.surface) : undefined,
    fee: toNum(p.fee as string | number | null),
    allowedAmount: p.allowedAmount != null ? toNum(p.allowedAmount as string | number) : undefined,
    paidAmount: p.paidAmount != null ? toNum(p.paidAmount as string | number) : undefined,
    patientResp: p.patientResp != null ? toNum(p.patientResp as string | number) : undefined,
    adjustmentAmount: p.adjustmentAmount != null ? toNum(p.adjustmentAmount as string | number) : undefined,
  }));

  return {
    id: api.id,
    patientId: api.patientId ?? '',
    patientName: api.patientName ?? 'Unknown',
    clinicId: api.clinicId,
    payerId: '',
    payerName: api.payerName ?? 'Unknown',
    subscriberId: '',
    provider: '',
    dateOfService: api.dateSubmitted ?? api.createdAt,
    dateSubmitted: api.dateSubmitted ?? api.createdAt,
    referenceNumber: api.pmsClaimId ?? api.id,
    status: (api.status ?? 'queued') as Claim['status'],
    totalFee: toNum(api.amountBilled),
    allowedAmount: undefined,
    paidAmount: toNum(api.amountPaid) || undefined,
    patientResp: undefined,
    denialReason: api.denialReason ?? undefined,
    denialCode: api.denialCode ?? undefined,
    lineItems,
    timeline: [],
  };
}

// ─── EOB ──────────────────────────────────────────────────────────────────

export function mapApiEobToEOB(api: ApiEob): EOB {
  const rawItems = Array.isArray(api.lineItems) ? api.lineItems : [];
  const lineItems: EOBLineItem[] = rawItems.map((item: Record<string, unknown>) => ({
    procedureCode: String(item.procedureCode ?? ''),
    procedureDescription: String(item.procedureDescription ?? item.description ?? ''),
    toothNumber: item.toothNumber ? String(item.toothNumber) : undefined,
    fee: toNum(item.fee as string | number | null),
    allowedAmount: toNum(item.allowedAmount as string | number | null),
    deductible: toNum(item.deductible as string | number | null),
    copay: toNum(item.copay as string | number | null),
    paidAmount: toNum(item.paidAmount as string | number | null),
    patientResp: toNum(item.patientResp as string | number | null),
    adjustmentAmount: toNum(item.adjustmentAmount as string | number | null),
    remarkCode: item.remarkCode ? String(item.remarkCode) : undefined,
  }));

  return {
    id: api.id,
    claimId: '',
    patientId: api.patientId ?? '',
    patientName: api.patientName ?? 'Unknown',
    clinicId: api.clinicId,
    payerId: '',
    payerName: api.payerName,
    dateOfService: api.checkDate ?? api.createdAt,
    dateReceived: api.receivedDate ?? api.createdAt,
    checkNumber: api.checkNumber ?? '',
    totalBilled: toNum(api.totalCharged),
    totalAllowed: toNum(api.totalCharged),
    totalPaid: toNum(api.totalPaid),
    totalPatientResp: toNum(api.totalPatientResp),
    totalAdjustment: toNum(api.totalAdjusted),
    lineItems,
  };
}

// ─── Recall ───────────────────────────────────────────────────────────────

export function mapApiRecallToRecall(api: ApiRecall): Recall {
  return {
    id: api.id,
    patientId: api.patientId,
    patientName: api.patientName,
    clinicId: api.clinicId,
    recallType: (api.recallType ?? 'Prophy') as Recall['recallType'],
    dueDate: api.dueDate,
    daysOverdue: api.daysOverdue,
    reminderCount: api.reminderCount,
    contactMethod: (api.contactMethod ?? 'email') as Recall['contactMethod'],
    status: (api.status ?? 'pending') as Recall['status'],
    phone: api.phone,
    email: api.email,
  };
}

// ─── Job ──────────────────────────────────────────────────────────────────

export function mapApiJobToJob(api: ApiJob): Job {
  const logEntries = Array.isArray(api.executionLog) ? api.executionLog : [];
  const logs: JobLogEntry[] = logEntries.map((entry: Record<string, unknown>) => ({
    timestamp: String(entry.timestamp ?? ''),
    step: String(entry.step ?? entry.action ?? ''),
    status: (entry.status ?? 'info') as JobLogEntry['status'],
    message: String(entry.message ?? ''),
    duration: entry.duration != null ? Number(entry.duration) : undefined,
  }));

  const durationMs = api.durationMs ?? (
    api.startedAt && api.completedAt
      ? new Date(api.completedAt).getTime() - new Date(api.startedAt).getTime()
      : undefined
  );

  // Calculate progress for running jobs
  let progress: number | undefined;
  if (api.status === 'running' && api.totalItems && api.processedItems != null) {
    progress = Math.round((api.processedItems / api.totalItems) * 100);
  }

  return {
    id: api.id,
    type: api.jobType as Job['type'],
    clinicId: api.clinicId,
    status: api.status as Job['status'],
    triggeredBy: api.triggeredBy ?? 'System',
    startedAt: api.startedAt ?? api.createdAt,
    completedAt: api.completedAt ?? undefined,
    duration: durationMs ?? undefined,
    progress,
    errorMessage: api.errorMessage ?? undefined,
    logs,
  };
}

// ─── Agent ────────────────────────────────────────────────────────────────

export function mapApiAgentToAgent(api: ApiAgent): AgentStatus {
  return {
    id: api.id,
    clinicId: api.clinicId,
    clinicName: api.clinicName,
    status: api.status,
    version: api.version,
    latestVersion: api.latestVersion,
    lastHeartbeat: api.lastHeartbeat,
    jobsInQueue: api.jobsInQueue,
    jobsCompletedToday: api.jobsCompletedToday,
    openDentalConnected: api.openDentalConnected,
    uptime: api.uptime,
    logs: api.logs.map(l => ({
      timestamp: l.timestamp,
      level: l.level as 'info' | 'warning' | 'error',
      message: l.message,
    })),
  };
}
