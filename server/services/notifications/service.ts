import { db } from '../../db/connection';
import { notifications } from '../../db/schema';
import type { Notification, NewNotification } from '../../db/schema';

export async function createNotification(
  params: Omit<NewNotification, 'id' | 'createdAt'>,
): Promise<Notification> {
  const [notification] = await db
    .insert(notifications)
    .values(params)
    .returning();

  return notification;
}

export async function createEligibilityNotification(
  check: {
    id: string;
    clinicId: string;
    patientId: string;
    eligibilityResult: string | null;
    errorMessage: string | null;
    payerName: string;
  },
  patient: { firstName: string; lastName: string },
): Promise<Notification> {
  const patientName = `${patient.firstName} ${patient.lastName}`;

  if (check.errorMessage) {
    return createNotification({
      clinicId: check.clinicId,
      type: 'eligibility_failed',
      severity: 'error',
      title: `Verification failed: ${patientName}`,
      message: `${check.payerName} eligibility check failed. ${check.errorMessage}`,
      relatedEntityType: 'eligibility_check',
      relatedEntityId: check.id,
      actionUrl: `/eligibility?patient_id=${check.patientId}`,
      targetRoles: ['staff_admin', 'staff_user'],
    });
  }

  if (check.eligibilityResult === 'inactive') {
    return createNotification({
      clinicId: check.clinicId,
      type: 'eligibility_inactive',
      severity: 'warning',
      title: `Insurance inactive: ${patientName}`,
      message: `${check.payerName} coverage is inactive for ${patientName}. Review and update insurance information.`,
      relatedEntityType: 'eligibility_check',
      relatedEntityId: check.id,
      actionUrl: `/eligibility?patient_id=${check.patientId}`,
      targetRoles: ['staff_admin', 'staff_user'],
    });
  }

  // Unknown status
  return createNotification({
    clinicId: check.clinicId,
    type: 'eligibility_failed',
    severity: 'warning',
    title: `Verification inconclusive: ${patientName}`,
    message: `${check.payerName} returned unknown status for ${patientName}. Manual verification required.`,
    relatedEntityType: 'eligibility_check',
    relatedEntityId: check.id,
    actionUrl: `/eligibility?patient_id=${check.patientId}`,
    targetRoles: ['staff_admin', 'staff_user'],
  });
}

export async function createBatchSummaryNotification(
  clinicId: string,
  results: { total: number; active: number; inactive: number; failed: number },
): Promise<Notification> {
  const hasIssues = results.inactive > 0 || results.failed > 0;

  return createNotification({
    clinicId,
    type: 'eligibility_batch_summary',
    severity: hasIssues ? 'warning' : 'info',
    title: 'Batch verification complete',
    message: `Verified ${results.total} patients: ${results.active} active, ${results.inactive} inactive, ${results.failed} failed.`,
    targetRoles: ['it_admin', 'staff_admin'],
  });
}
