// Maps backend API response shapes to existing frontend types.
// Keeps page components clean — they continue using the same types as before.

import { getInitials } from './formatters';
import type {
  User,
  Clinic,
  Patient,
  InsuranceInfo,
  Notification,
  Role,
} from '@/types';
import type {
  ApiUser,
  ApiClinic,
  ApiPatient,
  ApiInsurance,
  ApiNotification,
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
