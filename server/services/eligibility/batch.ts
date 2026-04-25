import { eq, and, or, lt, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/connection';
import { insuranceCache, patientsCache, settings } from '../../db/schema';
import { verifyPatientEligibility } from './engine';
import { createJob, updateJobStatus, appendToExecutionLog } from '../queue/manager';
import { createBatchSummaryNotification } from '../notifications/service';
import type { ExecutionLogEntry } from '../queue/types';

// ─── Settings Helpers ─────────────────────────────────────────���─────────────

async function getEligibilitySetting(clinicId: string, key: string, defaultValue: number): Promise<number> {
  const [setting] = await db
    .select()
    .from(settings)
    .where(
      and(
        eq(settings.clinicId, clinicId),
        eq(settings.category, 'eligibility'),
        eq(settings.key, key),
      ),
    )
    .limit(1);

  if (!setting) return defaultValue;
  return typeof setting.value === 'number' ? setting.value : Number(setting.value) || defaultValue;
}

// ─── Batch Verification ─────────────────────────────────────────────────────

export interface BatchResult {
  total: number;
  active: number;
  inactive: number;
  failed: number;
  skipped: number;
}

export async function runBatchVerification(
  clinicId: string,
  triggeredBy?: string | null,
): Promise<BatchResult> {
  const thresholdDays = await getEligibilitySetting(clinicId, 'verification_threshold_days', 30);
  const thresholdDate = new Date(Date.now() - thresholdDays * 86400000);

  // Query patients with stale or missing verification
  const staleInsurance = await db
    .select({
      insuranceId: insuranceCache.id,
      patientId: insuranceCache.patientId,
      carrierName: insuranceCache.carrierName,
      patientFirstName: patientsCache.firstName,
      patientLastName: patientsCache.lastName,
    })
    .from(insuranceCache)
    .innerJoin(patientsCache, eq(insuranceCache.patientId, patientsCache.id))
    .where(
      and(
        eq(insuranceCache.clinicId, clinicId),
        eq(patientsCache.status, 'active'),
        or(
          isNull(insuranceCache.lastVerifiedAt),
          lt(insuranceCache.lastVerifiedAt, thresholdDate),
        ),
      ),
    );

  if (staleInsurance.length === 0) {
    return { total: 0, active: 0, inactive: 0, failed: 0, skipped: 0 };
  }

  // Create job record
  const job = await createJob({
    clinicId,
    jobType: 'eligibility_batch',
    triggerSource: triggeredBy ? 'manual' : 'scheduler',
    triggeredBy,
    totalItems: staleInsurance.length,
  });

  const results: BatchResult = { total: staleInsurance.length, active: 0, inactive: 0, failed: 0, skipped: 0 };

  for (let i = 0; i < staleInsurance.length; i++) {
    const ins = staleInsurance[i];
    const stepNum = i + 1;
    const patientLabel = `${ins.patientFirstName} ${ins.patientLastName}`;

    const stepStart: ExecutionLogEntry = {
      step: stepNum,
      action: 'verify_patient',
      status: 'started',
      message: `Verifying ${patientLabel} (${ins.carrierName})`,
      timestamp: new Date().toISOString(),
    };
    await appendToExecutionLog(job.id, stepStart);

    const startTime = Date.now();

    try {
      const check = await verifyPatientEligibility({
        patientId: ins.patientId,
        insuranceId: ins.insuranceId,
        clinicId,
        trigger: 'batch_nightly',
        triggeredBy,
      });

      const elapsed = Date.now() - startTime;

      if (check.eligibilityResult === 'active') {
        results.active++;
      } else if (check.eligibilityResult === 'inactive') {
        results.inactive++;
      } else if (check.status === 'failed') {
        results.failed++;
      } else {
        results.skipped++;
      }

      await appendToExecutionLog(job.id, {
        step: stepNum,
        action: 'verify_patient',
        status: 'completed',
        message: `${patientLabel}: ${check.eligibilityResult ?? check.status}`,
        timestamp: new Date().toISOString(),
        durationMs: elapsed,
      });
    } catch (err) {
      results.failed++;
      const elapsed = Date.now() - startTime;

      await appendToExecutionLog(job.id, {
        step: stepNum,
        action: 'verify_patient',
        status: 'failed',
        message: `${patientLabel}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        durationMs: elapsed,
      });
    }

    // Update processed count
    await updateJobStatus(job.id, 'running', {
      processedItems: i + 1,
      failedItems: results.failed,
    });
  }

  // Complete job
  await updateJobStatus(job.id, 'completed', {
    completedAt: new Date(),
    processedItems: results.total,
    failedItems: results.failed,
    result: results,
  });

  // Create summary notification
  await createBatchSummaryNotification(clinicId, results).catch(() => {});

  return results;
}
