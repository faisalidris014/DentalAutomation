import { eq, and } from 'drizzle-orm';
import { db } from '../../db/connection';
import { clinics, eobRecords, payerConfigs, patientsCache } from '../../db/schema';
import type { EobRecord } from '../../db/schema';
import { getPayerAdapter } from '../../adapters/payer/registry';
import { getAdapter as getPmsAdapter } from '../../adapters/pms/registry';
import { parseEobDocument } from './parser';
import { triageEobRecord } from './triage';
import type { ParsedLineItem } from './parser';
import { createNotification } from '../notifications/service';

export interface EobSyncResult {
  totalRetrieved: number;
  autoPosted: number;
  flagged: number;
  errors: number;
  syncTimestamp: string;
}

async function getClinic(clinicId: string) {
  const [clinic] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);
  return clinic;
}

export async function syncEobs(clinicId: string): Promise<EobSyncResult> {
  const clinic = await getClinic(clinicId);
  if (!clinic) throw new Error(`Clinic ${clinicId} not found`);

  // Get all enabled payer configs with EOB feature enabled
  const configs = await db
    .select()
    .from(payerConfigs)
    .where(
      and(
        eq(payerConfigs.clinicId, clinicId),
        eq(payerConfigs.isEnabled, true),
      ),
    );

  let totalRetrieved = 0;
  let autoPosted = 0;
  let flagged = 0;
  let errors = 0;

  const dateFrom = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const dateTo = new Date().toISOString().split('T')[0];

  for (const config of configs) {
    // Check if EOB feature is enabled for this payer
    const features = config.featuresEnabled as Record<string, boolean> | null;
    if (features && features.eob === false) continue;

    try {
      const adapter = getPayerAdapter(config);

      // Skip adapters that don't support EOB retrieval
      if (!adapter.retrieveEOBs) continue;

      const rawEobs = await adapter.retrieveEOBs({
        dateFrom,
        dateTo,
        clinicNpi: clinic.npi ?? '',
      });

      for (const rawEob of rawEobs) {
        try {
          // Check for duplicate (same check number + payer)
          const [existing] = await db
            .select({ id: eobRecords.id })
            .from(eobRecords)
            .where(
              and(
                eq(eobRecords.clinicId, clinicId),
                eq(eobRecords.checkNumber, rawEob.checkNumber),
                eq(eobRecords.payerName, rawEob.payerName),
              ),
            )
            .limit(1);

          if (existing) continue; // Skip duplicates

          // Parse the document
          const { record, parsedLineItems } = await parseEobDocument(rawEob, clinicId);

          // Insert the record
          const [inserted] = await db
            .insert(eobRecords)
            .values(record)
            .returning();

          totalRetrieved++;

          // Triage
          const triage = await triageEobRecord(
            parsedLineItems,
            clinicId,
            rawEob.checkNumber,
          );

          // Update triage status
          await db
            .update(eobRecords)
            .set({
              triageStatus: triage.triageStatus,
              triageReason: triage.triageReason,
              updatedAt: new Date(),
            })
            .where(eq(eobRecords.id, inserted.id));

          if (triage.triageStatus === 'auto_post') {
            autoPosted++;
          } else {
            flagged++;
            // Notify staff about flagged EOBs
            await createEobFlaggedNotification(inserted, triage.triageReason, clinicId);
          }
        } catch (err) {
          console.error(`[EOB] Error processing EOB check ${rawEob.checkNumber}:`, err);
          errors++;
        }
      }
    } catch (err) {
      console.error(`[EOB] Error retrieving EOBs from ${config.payerName}:`, err);
      errors++;
    }
  }

  return {
    totalRetrieved,
    autoPosted,
    flagged,
    errors,
    syncTimestamp: new Date().toISOString(),
  };
}

export async function postEobToPms(
  eobId: string,
  clinicId: string,
): Promise<{ success: boolean; pmsRecordId?: string; error?: string }> {
  const clinic = await getClinic(clinicId);
  if (!clinic) throw new Error(`Clinic ${clinicId} not found`);

  const [eob] = await db
    .select()
    .from(eobRecords)
    .where(and(eq(eobRecords.id, eobId), eq(eobRecords.clinicId, clinicId)))
    .limit(1);

  if (!eob) throw new Error(`EOB ${eobId} not found`);
  if (eob.postedToPms) throw new Error(`EOB ${eobId} already posted to PMS`);

  const pmsAdapter = getPmsAdapter(clinic);
  const lineItems = (eob.lineItems as ParsedLineItem[]) ?? [];

  const result = await pmsAdapter.postInsurancePayment({
    checkNumber: eob.checkNumber ?? '',
    checkDate: eob.checkDate ?? new Date().toISOString().split('T')[0],
    checkAmount: Number(eob.checkAmount ?? 0),
    carrierName: eob.payerName,
    lineItems: lineItems
      .filter((li) => li.claimPmsId)
      .map((li) => ({
        claimPmsId: li.claimPmsId!,
        procedureCode: li.procedureCode,
        amountPaid: li.paid,
        amountAllowed: li.allowed,
        adjustment: li.adjustment,
        patientResponsibility: li.patientResponsibility,
        denialCode: li.denialCode,
      })),
  });

  if (result.success) {
    await db
      .update(eobRecords)
      .set({
        postedToPms: true,
        pmsClaimPaymentId: result.pmsRecordId,
        postedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(eobRecords.id, eobId));
  }

  return result;
}

export async function reviewEob(
  eobId: string,
  clinicId: string,
  userId: string,
  action: 'approve' | 'reject',
  notes?: string,
): Promise<EobRecord> {
  const [eob] = await db
    .select()
    .from(eobRecords)
    .where(and(eq(eobRecords.id, eobId), eq(eobRecords.clinicId, clinicId)))
    .limit(1);

  if (!eob) throw new Error(`EOB ${eobId} not found`);

  if (action === 'approve') {
    // Post to PMS first
    const postResult = await postEobToPms(eobId, clinicId);
    if (!postResult.success) {
      throw new Error(`Failed to post EOB to PMS: ${postResult.error}`);
    }

    const [updated] = await db
      .update(eobRecords)
      .set({
        triageStatus: 'manually_posted',
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(eobRecords.id, eobId))
      .returning();

    return updated;
  }

  // Reject
  const [updated] = await db
    .update(eobRecords)
    .set({
      triageStatus: 'skipped',
      reviewedBy: userId,
      reviewedAt: new Date(),
      reviewNotes: notes ?? null,
      updatedAt: new Date(),
    })
    .where(eq(eobRecords.id, eobId))
    .returning();

  return updated;
}

export async function autoPostEligibleEobs(clinicId: string): Promise<number> {
  const eligible = await db
    .select({ id: eobRecords.id })
    .from(eobRecords)
    .where(
      and(
        eq(eobRecords.clinicId, clinicId),
        eq(eobRecords.triageStatus, 'auto_post'),
        eq(eobRecords.postedToPms, false),
      ),
    );

  let posted = 0;
  for (const eob of eligible) {
    try {
      const result = await postEobToPms(eob.id, clinicId);
      if (result.success) posted++;
    } catch (err) {
      console.error(`[EOB] Auto-post failed for ${eob.id}:`, err);
    }
  }

  return posted;
}

async function createEobFlaggedNotification(
  eob: EobRecord,
  reason: string | null,
  clinicId: string,
) {
  let patientName = 'Unknown patient';
  if (eob.patientId) {
    const [patient] = await db
      .select({ firstName: patientsCache.firstName, lastName: patientsCache.lastName })
      .from(patientsCache)
      .where(eq(patientsCache.id, eob.patientId))
      .limit(1);
    if (patient) patientName = `${patient.firstName} ${patient.lastName}`;
  } else {
    // Multi-patient EOB or no patient match — fall back to first line item's name
    const firstLine = (eob.lineItems as ParsedLineItem[] | null)?.[0];
    if (firstLine?.patientName) patientName = firstLine.patientName;
  }

  await createNotification({
    clinicId,
    type: 'eob_flagged',
    severity: 'warning',
    title: `EOB flagged for review: ${eob.payerName}`,
    message: `Check #${eob.checkNumber ?? 'N/A'} for ${patientName} ($${eob.totalPaid ?? '0'}) requires manual review. ${reason ?? ''}`.trim(),
    relatedEntityType: 'eob_record',
    relatedEntityId: eob.id,
    actionUrl: `/eob?id=${eob.id}`,
    targetRoles: ['staff_admin', 'it_admin'],
  });
}
