import type { Job } from '../../db/schema';
import type { ExecutionLogEntry, JobType } from './types';
import { getNextJob, updateJobStatus, appendToExecutionLog } from './manager';
import { syncPatients, syncInsurance, fullSync } from '../sync/engine';
import { runBatchVerification } from '../eligibility/batch';
import { runDayOfServiceRecheck } from '../eligibility/recheck';
import { verifyPatientEligibility } from '../eligibility/engine';

type JobHandler = (job: Job) => Promise<void>;

const jobHandlers: Partial<Record<JobType, JobHandler>> = {
  sync_patients: async (job) => {
    const result = await syncPatients(job.clinicId);
    await updateJobStatus(job.id, 'completed', {
      completedAt: new Date(),
      processedItems: result.inserted + result.updated,
      failedItems: result.errors,
      result,
    });
  },

  sync_insurance: async (job) => {
    // For insurance sync, we need patient IDs from job result or sync all
    const result = await fullSync(job.clinicId);
    await updateJobStatus(job.id, 'completed', {
      completedAt: new Date(),
      processedItems: result.inserted + result.updated,
      failedItems: result.errors,
      result,
    });
  },

  sync_claims: async (job) => {
    // Claims sync — placeholder for Phase 2+
    await updateJobStatus(job.id, 'completed', {
      completedAt: new Date(),
      result: { message: 'Claims sync not yet implemented' },
    });
  },

  sync_appointments: async (job) => {
    // Appointments are queried live, no cache to sync
    await updateJobStatus(job.id, 'completed', {
      completedAt: new Date(),
      result: { message: 'Appointments queried live from PMS' },
    });
  },

  eligibility_batch: async (job) => {
    // Batch creates its own sub-job internally for detailed tracking;
    // this handler just orchestrates and reports the top-level result
    const result = await runBatchVerification(job.clinicId, job.triggeredBy ?? undefined);
    await updateJobStatus(job.id, 'completed', {
      completedAt: new Date(),
      processedItems: result.total,
      failedItems: result.failed,
      result,
    });
  },

  eligibility_single: async (job) => {
    // relatedEntityId may contain the insurance ID; extract patient/insurance from job result metadata
    const metadata = (job.result ?? {}) as Record<string, string>;
    const patientId = metadata.patientId ?? job.relatedEntityId ?? '';
    const insuranceId = metadata.insuranceId ?? '';

    if (!patientId || !insuranceId) {
      await updateJobStatus(job.id, 'completed', {
        completedAt: new Date(),
        result: { message: 'Missing patientId or insuranceId in job metadata' },
      });
      return;
    }

    const check = await verifyPatientEligibility({
      patientId,
      insuranceId,
      clinicId: job.clinicId,
      trigger: 'webhook',
      triggeredBy: job.triggeredBy,
    });

    await updateJobStatus(job.id, 'completed', {
      completedAt: new Date(),
      processedItems: 1,
      result: { eligibilityResult: check.eligibilityResult, status: check.status },
    });
  },

  eligibility_recheck: async (job) => {
    const result = await runDayOfServiceRecheck(job.clinicId);
    await updateJobStatus(job.id, 'completed', {
      completedAt: new Date(),
      processedItems: result.total,
      failedItems: result.failed,
      result,
    });
  },

  // Phase 3 stubs
  eob_sync: async (job) => {
    await updateJobStatus(job.id, 'completed', {
      completedAt: new Date(),
      result: { message: 'EOB sync not yet implemented — Phase 3' },
    });
  },

  eob_post: async (job) => {
    await updateJobStatus(job.id, 'completed', {
      completedAt: new Date(),
      result: { message: 'EOB post not yet implemented — Phase 3' },
    });
  },

  eob_report: async (job) => {
    await updateJobStatus(job.id, 'completed', {
      completedAt: new Date(),
      result: { message: 'EOB report not yet implemented — Phase 3' },
    });
  },

  webhook_process: async (job) => {
    // Webhook jobs are created by the webhook endpoint; the event data is stored
    // in relatedEntityType/relatedEntityId. For eligibility-related events,
    // we'd look up the patient/insurance and trigger verification.
    // For now, log the event as processed — the webhook route already created
    // the appropriate eligibility_single job if needed.
    await updateJobStatus(job.id, 'completed', {
      completedAt: new Date(),
      result: {
        message: `Webhook event processed: ${job.relatedEntityType}`,
      },
    });
  },
};

export async function processNextJob(): Promise<boolean> {
  const job = await getNextJob();
  if (!job) return false;

  const startTime = Date.now();

  const startEntry: ExecutionLogEntry = {
    step: 1,
    action: job.jobType,
    status: 'started',
    message: `Starting ${job.jobType}`,
    timestamp: new Date().toISOString(),
  };

  await updateJobStatus(job.id, 'running', { startedAt: new Date() });
  await appendToExecutionLog(job.id, startEntry);

  const handler = jobHandlers[job.jobType as JobType];
  if (!handler) {
    await updateJobStatus(job.id, 'failed', {
      completedAt: new Date(),
      durationMs: Date.now() - startTime,
      errorMessage: `No handler for job type: ${job.jobType}`,
    });
    return true;
  }

  try {
    await handler(job);

    const durationMs = Date.now() - startTime;
    await appendToExecutionLog(job.id, {
      step: 2,
      action: job.jobType,
      status: 'completed',
      message: `Completed ${job.jobType}`,
      timestamp: new Date().toISOString(),
      durationMs,
    });

    // Update duration if not already set by handler
    await updateJobStatus(job.id, 'completed', {
      completedAt: new Date(),
      durationMs,
    });
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    await appendToExecutionLog(job.id, {
      step: 2,
      action: job.jobType,
      status: 'failed',
      message: errorMessage,
      timestamp: new Date().toISOString(),
      durationMs,
    });

    const retryCount = job.retryCount ?? 0;
    const maxRetries = job.maxRetries ?? 3;

    if (retryCount < maxRetries) {
      const nextRetryAt = new Date(Date.now() + 1000 * 60 * Math.pow(2, retryCount));
      await updateJobStatus(job.id, 'retrying', {
        durationMs,
        errorMessage,
        retryCount: retryCount + 1,
        nextRetryAt,
      });
    } else {
      await updateJobStatus(job.id, 'failed', {
        completedAt: new Date(),
        durationMs,
        errorMessage,
      });
    }
  }

  return true;
}
