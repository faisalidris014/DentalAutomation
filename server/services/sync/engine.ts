import { eq, and } from 'drizzle-orm';
import { db } from '../../db/connection';
import { clinics, patientsCache, insuranceCache } from '../../db/schema';
import { getAdapter } from '../../adapters/pms/registry';
import type { CanonicalPatient, CanonicalInsurancePlan } from '../../adapters/pms/types';
import { diffRecords, hashRecord } from './differ';

export interface SyncJobResult {
  inserted: number;
  updated: number;
  unchanged: number;
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

export async function syncPatients(clinicId: string): Promise<SyncJobResult> {
  const clinic = await getClinic(clinicId);
  if (!clinic) throw new Error(`Clinic ${clinicId} not found`);

  const adapter = getAdapter(clinic);

  // Get last sync timestamp
  const existingPatients = await db
    .select({
      pmsPatientId: patientsCache.pmsPatientId,
      firstName: patientsCache.firstName,
      lastName: patientsCache.lastName,
      dateOfBirth: patientsCache.dateOfBirth,
      status: patientsCache.status,
    })
    .from(patientsCache)
    .where(eq(patientsCache.clinicId, clinicId));

  const existingMap = new Map(
    existingPatients.map((p) => [
      p.pmsPatientId,
      { hash: hashRecord({ firstName: p.firstName, lastName: p.lastName, dateOfBirth: p.dateOfBirth, status: p.status }) },
    ]),
  );

  // Pull from PMS
  const syncResult = await adapter.getPatients({});
  const incoming = syncResult.items;

  const diff = diffRecords<CanonicalPatient>(
    existingMap,
    incoming,
    (p) => p.pmsId,
    (p) => hashRecord({ firstName: p.firstName, lastName: p.lastName, dateOfBirth: p.dateOfBirth, status: p.status }),
  );

  let errors = 0;
  const now = new Date();

  // Insert new patients
  if (diff.inserts.length > 0) {
    try {
      await db.insert(patientsCache).values(
        diff.inserts.map((p) => ({
          clinicId,
          pmsPatientId: p.pmsId,
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: p.dateOfBirth,
          gender: p.gender,
          phoneHome: p.phoneHome,
          phoneCell: p.phoneCell,
          email: p.email,
          address: p.address,
          city: p.city,
          state: p.state,
          zip: p.zip,
          guarantorId: p.guarantorPmsId,
          preferredContact: p.preferredContact,
          balance: p.balance !== undefined ? String(p.balance) : '0',
          status: p.status,
          lastSyncedAt: now,
        })),
      );
    } catch (err) {
      console.error('[Sync] Insert error:', err);
      errors += diff.inserts.length;
    }
  }

  // Update existing patients
  for (const p of diff.updates) {
    try {
      await db
        .update(patientsCache)
        .set({
          firstName: p.firstName,
          lastName: p.lastName,
          dateOfBirth: p.dateOfBirth,
          gender: p.gender,
          phoneHome: p.phoneHome,
          phoneCell: p.phoneCell,
          email: p.email,
          address: p.address,
          city: p.city,
          state: p.state,
          zip: p.zip,
          guarantorId: p.guarantorPmsId,
          preferredContact: p.preferredContact,
          balance: p.balance !== undefined ? String(p.balance) : undefined,
          status: p.status,
          lastSyncedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(patientsCache.clinicId, clinicId),
            eq(patientsCache.pmsPatientId, p.pmsId),
          ),
        );
    } catch (err) {
      console.error(`[Sync] Update error for patient ${p.pmsId}:`, err);
      errors++;
    }
  }

  return {
    inserted: diff.inserts.length - errors,
    updated: diff.updates.length,
    unchanged: diff.unchanged.length,
    errors,
    syncTimestamp: now.toISOString(),
  };
}

export async function syncInsurance(clinicId: string, patientIds: string[]): Promise<SyncJobResult> {
  const clinic = await getClinic(clinicId);
  if (!clinic) throw new Error(`Clinic ${clinicId} not found`);

  const adapter = getAdapter(clinic);
  let inserted = 0, updated = 0, errors = 0;
  const now = new Date();

  // Get patients with their PMS IDs
  const patients = await db
    .select({ id: patientsCache.id, pmsPatientId: patientsCache.pmsPatientId })
    .from(patientsCache)
    .where(eq(patientsCache.clinicId, clinicId));

  const patientMap = new Map(patients.map((p) => [p.id, p.pmsPatientId]));

  for (const patientId of patientIds) {
    const pmsPatientId = patientMap.get(patientId);
    if (!pmsPatientId) continue;

    try {
      const plans = await adapter.getInsurancePlans(pmsPatientId);

      for (const plan of plans) {
        // Check if this insurance record already exists
        const [existing] = await db
          .select()
          .from(insuranceCache)
          .where(
            and(
              eq(insuranceCache.patientId, patientId),
              eq(insuranceCache.ordinal, plan.ordinal),
            ),
          )
          .limit(1);

        const record = {
          patientId,
          clinicId,
          ordinal: plan.ordinal,
          pmsPatplanId: plan.patPlanPmsId,
          pmsInssubId: plan.insSubPmsId,
          pmsInsplanId: plan.insPlanPmsId,
          pmsCarrierId: plan.carrierPmsId,
          carrierName: plan.carrierName,
          carrierPhone: plan.carrierPhone,
          carrierElectId: plan.carrierElectId,
          groupName: plan.groupName,
          groupNumber: plan.groupNumber,
          subscriberId: plan.subscriberId,
          subscriberName: plan.subscriberName,
          planType: plan.planType,
          filingCode: plan.filingCode,
          lastSyncedAt: now,
        };

        if (existing) {
          await db
            .update(insuranceCache)
            .set({ ...record, updatedAt: now })
            .where(eq(insuranceCache.id, existing.id));
          updated++;
        } else {
          await db.insert(insuranceCache).values(record);
          inserted++;
        }
      }
    } catch (err) {
      console.error(`[Sync] Insurance error for patient ${patientId}:`, err);
      errors++;
    }
  }

  return {
    inserted,
    updated,
    unchanged: 0,
    errors,
    syncTimestamp: now.toISOString(),
  };
}

export async function fullSync(clinicId: string): Promise<SyncJobResult> {
  const patientResult = await syncPatients(clinicId);

  // Get all patient IDs for insurance sync
  const allPatients = await db
    .select({ id: patientsCache.id })
    .from(patientsCache)
    .where(eq(patientsCache.clinicId, clinicId));

  const insuranceResult = await syncInsurance(
    clinicId,
    allPatients.map((p) => p.id),
  );

  return {
    inserted: patientResult.inserted + insuranceResult.inserted,
    updated: patientResult.updated + insuranceResult.updated,
    unchanged: patientResult.unchanged,
    errors: patientResult.errors + insuranceResult.errors,
    syncTimestamp: new Date().toISOString(),
  };
}
