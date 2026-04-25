import { eq, and } from 'drizzle-orm';
import { db } from '../../db/connection';
import {
  patientsCache,
  insuranceCache,
  eligibilityChecks,
  clinics,
  payerConfigs,
} from '../../db/schema';
import type { EligibilityCheck } from '../../db/schema';
import { classifyPayer } from './classifier';
import { getPayerAdapter } from '../../adapters/payer/registry';
import { getAdapter as getPMSAdapter } from '../../adapters/pms/registry';
import type { EligibilityResult } from '../../adapters/payer/types';
import { createEligibilityNotification } from '../notifications/service';
import { NotFoundError } from '../../middleware/errors';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VerifyParams {
  patientId: string;
  insuranceId: string;
  clinicId: string;
  trigger: 'batch_nightly' | 'batch_recheck' | 'on_demand' | 'webhook';
  triggeredBy?: string | null;
}

// ─── PMS Write-Back Check ───────────────────────────────────────────────────

function hasRealPMSCredentials(pmsConfig: unknown): boolean {
  if (!pmsConfig || typeof pmsConfig !== 'object') return false;
  const config = pmsConfig as Record<string, unknown>;
  const devKey = String(config.developer_key ?? '');
  const custKey = String(config.customer_key ?? '');
  return devKey !== '' && devKey !== 'placeholder' && custKey !== '' && custKey !== 'placeholder';
}

// ─── Core Verification ──────────────────────────────────────────────────────

export async function verifyPatientEligibility(
  params: VerifyParams,
): Promise<EligibilityCheck> {
  // 1. Read patient
  const [patient] = await db
    .select()
    .from(patientsCache)
    .where(eq(patientsCache.id, params.patientId))
    .limit(1);

  if (!patient) throw new NotFoundError('Patient');

  // 2. Read insurance
  const [insurance] = await db
    .select()
    .from(insuranceCache)
    .where(eq(insuranceCache.id, params.insuranceId))
    .limit(1);

  if (!insurance) throw new NotFoundError('Insurance record');

  // 3. Read clinic for NPI
  const [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.id, params.clinicId))
    .limit(1);

  if (!clinic) throw new NotFoundError('Clinic');

  // 4. Classify payer
  const classification = classifyPayer(insurance.carrierName ?? '');

  if (classification.payerType === 'unknown') {
    const [check] = await db
      .insert(eligibilityChecks)
      .values({
        clinicId: params.clinicId,
        patientId: params.patientId,
        insuranceId: params.insuranceId,
        payerName: insurance.carrierName ?? 'Unknown',
        payerType: 'unknown',
        adapterUsed: 'manual_review',
        trigger: params.trigger,
        triggeredBy: params.triggeredBy,
        status: 'completed',
        eligibilityResult: 'unknown',
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 0,
        writtenToPms: false,
        pmsWriteResult: 'skipped_unknown_payer',
      })
      .returning();

    return check;
  }

  // 5. Look up payer config
  const [payerConfig] = await db
    .select()
    .from(payerConfigs)
    .where(
      and(
        eq(payerConfigs.clinicId, params.clinicId),
        eq(payerConfigs.payerName, insurance.carrierName ?? ''),
      ),
    )
    .limit(1);

  if (!payerConfig || !payerConfig.isEnabled) {
    const [check] = await db
      .insert(eligibilityChecks)
      .values({
        clinicId: params.clinicId,
        patientId: params.patientId,
        insuranceId: params.insuranceId,
        payerName: insurance.carrierName ?? 'Unknown',
        payerType: classification.payerType,
        adapterUsed: classification.adapterKey,
        trigger: params.trigger,
        triggeredBy: params.triggeredBy,
        status: 'completed',
        eligibilityResult: 'unknown',
        startedAt: new Date(),
        completedAt: new Date(),
        durationMs: 0,
        writtenToPms: false,
        pmsWriteResult: payerConfig ? 'skipped_payer_disabled' : 'skipped_no_payer_config',
      })
      .returning();

    return check;
  }

  // 6. Get payer adapter
  const adapter = getPayerAdapter({
    adapterKey: payerConfig.adapterKey,
    payerName: payerConfig.payerName,
    credentials: payerConfig.credentials,
  });

  // 7. Build request
  const request = {
    subscriberId: insurance.subscriberId ?? '',
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth ?? '',
    providerNpi: clinic.npi ?? '',
    dateOfService: new Date().toISOString().split('T')[0],
  };

  // 8. Execute verification
  const startedAt = new Date();
  let result: EligibilityResult;

  try {
    result = await adapter.checkEligibility(request);
  } catch (err) {
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();
    const errorMessage = err instanceof Error ? err.message : 'Verification failed';

    const [check] = await db
      .insert(eligibilityChecks)
      .values({
        clinicId: params.clinicId,
        patientId: params.patientId,
        insuranceId: params.insuranceId,
        payerName: payerConfig.payerName,
        payerType: classification.payerType,
        adapterUsed: payerConfig.adapterKey,
        trigger: params.trigger,
        triggeredBy: params.triggeredBy,
        status: 'failed',
        errorMessage,
        startedAt,
        completedAt,
        durationMs,
        writtenToPms: false,
        pmsWriteResult: 'skipped_verification_failed',
      })
      .returning();

    // Create error notification
    await createEligibilityNotification(
      { ...check, eligibilityResult: null, errorMessage },
      patient,
    ).catch(() => {});

    return check;
  }

  const completedAt = new Date();
  const durationMs = completedAt.getTime() - startedAt.getTime();

  // 9. Store result
  const [check] = await db
    .insert(eligibilityChecks)
    .values({
      clinicId: params.clinicId,
      patientId: params.patientId,
      insuranceId: params.insuranceId,
      payerName: payerConfig.payerName,
      payerType: classification.payerType,
      adapterUsed: payerConfig.adapterKey,
      trigger: params.trigger,
      triggeredBy: params.triggeredBy,
      status: 'completed',
      eligibilityResult: result.status,
      effectiveDate: result.effectiveDate,
      terminationDate: result.terminationDate,
      managedCarePlan: result.managedCarePlan,
      dentalCoverage: result.dentalCoverageIncluded,
      resultDetails: {
        annualMaximum: result.annualMaximum,
        annualMaximumUsed: result.annualMaximumUsed,
        deductible: result.deductible,
        deductibleMet: result.deductibleMet,
        coveragePercentages: result.coveragePercentages,
        copays: result.copays,
        waitingPeriods: result.waitingPeriods,
      },
      rawResponse: result.rawResponse,
      startedAt,
      completedAt,
      durationMs,
    })
    .returning();

  // 10. Update insurance cache verification status
  await db
    .update(insuranceCache)
    .set({
      lastVerifiedAt: new Date(),
      verificationStatus: result.status,
      updatedAt: new Date(),
    })
    .where(eq(insuranceCache.id, params.insuranceId));

  // 11. PMS write-back (config-gated)
  if (hasRealPMSCredentials(clinic.pmsConfig) && insurance.pmsPatplanId) {
    try {
      const pmsAdapter = getPMSAdapter(clinic);
      const writeResult = await pmsAdapter.writeVerificationResult({
        patPlanPmsId: insurance.pmsPatplanId,
        verifyDate: new Date().toISOString().split('T')[0],
        verifyNote: `DentalFlow auto-verified: ${result.status}`,
      });

      await db
        .update(eligibilityChecks)
        .set({
          writtenToPms: writeResult.success,
          pmsWriteResult: writeResult.success ? 'success' : 'failed',
          pmsInsverifyId: writeResult.pmsRecordId,
        })
        .where(eq(eligibilityChecks.id, check.id));
    } catch (err) {
      await db
        .update(eligibilityChecks)
        .set({
          writtenToPms: false,
          pmsWriteResult: `error: ${err instanceof Error ? err.message : 'unknown'}`,
        })
        .where(eq(eligibilityChecks.id, check.id));
    }
  } else {
    await db
      .update(eligibilityChecks)
      .set({
        writtenToPms: false,
        pmsWriteResult: 'skipped_no_credentials',
      })
      .where(eq(eligibilityChecks.id, check.id));
  }

  // 12. Create notification if inactive or failed
  if (result.status === 'inactive' || result.status === 'unknown') {
    await createEligibilityNotification(check, patient).catch(() => {});
  }

  return check;
}
