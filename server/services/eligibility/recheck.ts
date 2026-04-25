import { eq, and, isNotNull } from 'drizzle-orm';
import { db } from '../../db/connection';
import { insuranceCache, patientsCache } from '../../db/schema';
import { verifyPatientEligibility } from './engine';
import { createJob, updateJobStatus, appendToExecutionLog } from '../queue/manager';
import { createNotification } from '../notifications/service';
import type { ExecutionLogEntry } from '../queue/types';

// ─── Day-of-Service Recheck ─────────────────────────────────────────────────

export interface RecheckResult {
  total: number;
  changed: number;
  unchanged: number;
  failed: number;
}

export async function runDayOfServiceRecheck(clinicId: string): Promise<RecheckResult> {
  // Query insurance records that were previously verified as active
  const activeInsurance = await db
    .select({
      insuranceId: insuranceCache.id,
      patientId: insuranceCache.patientId,
      carrierName: insuranceCache.carrierName,
      previousStatus: insuranceCache.verificationStatus,
      patientFirstName: patientsCache.firstName,
      patientLastName: patientsCache.lastName,
    })
    .from(insuranceCache)
    .innerJoin(patientsCache, eq(insuranceCache.patientId, patientsCache.id))
    .where(
      and(
        eq(insuranceCache.clinicId, clinicId),
        eq(patientsCache.status, 'active'),
        eq(insuranceCache.verificationStatus, 'active'),
        isNotNull(insuranceCache.lastVerifiedAt),
      ),
    );

  if (activeInsurance.length === 0) {
    return { total: 0, changed: 0, unchanged: 0, failed: 0 };
  }

  // Create job record
  const job = await createJob({
    clinicId,
    jobType: 'eligibility_recheck',
    triggerSource: 'scheduler',
    totalItems: activeInsurance.length,
  });

  const results: RecheckResult = { total: activeInsurance.length, changed: 0, unchanged: 0, failed: 0 };

  for (let i = 0; i < activeInsurance.length; i++) {
    const ins = activeInsurance[i];
    const stepNum = i + 1;
    const patientLabel = `${ins.patientFirstName} ${ins.patientLastName}`;
    const startTime = Date.now();

    try {
      const check = await verifyPatientEligibility({
        patientId: ins.patientId,
        insuranceId: ins.insuranceId,
        clinicId,
        trigger: 'batch_recheck',
      });

      const elapsed = Date.now() - startTime;
      const newStatus = check.eligibilityResult;
      const statusChanged = newStatus !== ins.previousStatus;

      if (statusChanged) {
        results.changed++;

        // Create urgent notification if status dropped from active
        if (newStatus === 'inactive') {
          await createNotification({
            clinicId,
            type: 'eligibility_inactive',
            severity: 'error',
            title: `URGENT: Insurance now inactive — ${patientLabel}`,
            message: `${ins.carrierName} coverage for ${patientLabel} changed from active to inactive on day of service. Immediate attention required.`,
            relatedEntityType: 'eligibility_check',
            relatedEntityId: check.id,
            actionUrl: `/eligibility?patient_id=${ins.patientId}`,
            targetRoles: ['staff_admin', 'staff_user'],
          }).catch(() => {});
        }
      } else {
        results.unchanged++;
      }

      await appendToExecutionLog(job.id, {
        step: stepNum,
        action: 'recheck_patient',
        status: 'completed',
        message: `${patientLabel}: ${statusChanged ? `CHANGED ${ins.previousStatus} → ${newStatus}` : `unchanged (${newStatus})`}`,
        timestamp: new Date().toISOString(),
        durationMs: elapsed,
      });
    } catch (err) {
      results.failed++;

      await appendToExecutionLog(job.id, {
        step: stepNum,
        action: 'recheck_patient',
        status: 'failed',
        message: `${patientLabel}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      });
    }

    await updateJobStatus(job.id, 'running', {
      processedItems: i + 1,
      failedItems: results.failed,
    });
  }

  await updateJobStatus(job.id, 'completed', {
    completedAt: new Date(),
    processedItems: results.total,
    failedItems: results.failed,
    result: results,
  });

  return results;
}
