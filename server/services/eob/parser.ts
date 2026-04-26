import { eq, and, ilike } from 'drizzle-orm';
import { db } from '../../db/connection';
import { patientsCache } from '../../db/schema';
import type { NewEobRecord } from '../../db/schema';
import type { RawEOBDocument, RawEOBLineItem } from '../../adapters/payer/types';

export interface ParsedLineItem {
  patientPmsId?: string;
  patientCacheId?: string;
  patientName: string;
  procedureCode: string;
  toothNumber?: string;
  serviceDate: string;
  fee: number;
  allowed: number;
  paid: number;
  adjustment: number;
  patientResponsibility: number;
  denialCode?: string;
  denialReason?: string;
  claimPmsId?: string;
  matchStatus: 'exact' | 'fuzzy' | 'unmatched';
}

interface PatientMatch {
  id: string;
  pmsPatientId: string;
  matchType: 'exact' | 'fuzzy';
}

async function matchPatient(
  lineItem: RawEOBLineItem,
  clinicId: string,
): Promise<PatientMatch | null> {
  // Try exact match by PMS patient ID first
  if (lineItem.patientPmsId) {
    const [patient] = await db
      .select({ id: patientsCache.id, pmsPatientId: patientsCache.pmsPatientId })
      .from(patientsCache)
      .where(
        and(
          eq(patientsCache.clinicId, clinicId),
          eq(patientsCache.pmsPatientId, lineItem.patientPmsId),
        ),
      )
      .limit(1);

    if (patient) return { id: patient.id, pmsPatientId: patient.pmsPatientId, matchType: 'exact' };
  }

  // Fuzzy fallback: first name + last name + DOB
  if (lineItem.patientFirstName && lineItem.patientLastName) {
    const conditions = [
      eq(patientsCache.clinicId, clinicId),
      ilike(patientsCache.firstName, lineItem.patientFirstName.trim()),
      ilike(patientsCache.lastName, lineItem.patientLastName.trim()),
    ];

    if (lineItem.patientDob) {
      conditions.push(eq(patientsCache.dateOfBirth, lineItem.patientDob));
    }

    const matches = await db
      .select({ id: patientsCache.id, pmsPatientId: patientsCache.pmsPatientId })
      .from(patientsCache)
      .where(and(...conditions))
      .limit(2);

    // Only accept if exactly one match (ambiguous = unmatched)
    if (matches.length === 1) {
      return { id: matches[0].id, pmsPatientId: matches[0].pmsPatientId, matchType: 'fuzzy' };
    }
  }

  return null;
}

export async function parseEobDocument(
  raw: RawEOBDocument,
  clinicId: string,
): Promise<{ record: Omit<NewEobRecord, 'id' | 'createdAt' | 'updatedAt'>; parsedLineItems: ParsedLineItem[] }> {
  const parsedLineItems: ParsedLineItem[] = [];
  let totalCharged = 0;
  let totalPaid = 0;
  let totalAdjusted = 0;
  let totalPatientResp = 0;
  let primaryPatientId: string | null = null;

  for (const item of raw.lineItems) {
    const match = await matchPatient(item, clinicId);

    const parsed: ParsedLineItem = {
      patientPmsId: match?.pmsPatientId ?? item.patientPmsId,
      patientCacheId: match?.id,
      patientName: `${item.patientFirstName} ${item.patientLastName}`,
      procedureCode: item.procedureCode,
      toothNumber: item.toothNumber,
      serviceDate: item.serviceDate,
      fee: item.fee,
      allowed: item.allowed,
      paid: item.paid,
      adjustment: item.adjustment,
      patientResponsibility: item.patientResponsibility,
      denialCode: item.denialCode,
      denialReason: item.denialReason,
      claimPmsId: item.claimPmsId,
      matchStatus: match?.matchType ?? 'unmatched',
    };

    parsedLineItems.push(parsed);
    totalCharged += item.fee;
    totalPaid += item.paid;
    totalAdjusted += item.adjustment;
    totalPatientResp += item.patientResponsibility;

    // Use the first matched patient as the primary patient for the EOB record
    if (!primaryPatientId && match) {
      primaryPatientId = match.id;
    }
  }

  const record: Omit<NewEobRecord, 'id' | 'createdAt' | 'updatedAt'> = {
    clinicId,
    patientId: primaryPatientId,
    payerName: raw.payerName,
    checkNumber: raw.checkNumber,
    checkDate: raw.checkDate,
    checkAmount: String(raw.checkAmount),
    receivedDate: raw.receivedDate ?? new Date().toISOString().split('T')[0],
    lineItems: parsedLineItems,
    totalCharged: String(Math.round(totalCharged * 100) / 100),
    totalPaid: String(Math.round(totalPaid * 100) / 100),
    totalAdjusted: String(Math.round(totalAdjusted * 100) / 100),
    totalPatientResp: String(Math.round(totalPatientResp * 100) / 100),
    triageStatus: 'pending',
    source: raw.source,
    rawData: raw.rawData ?? null,
  };

  return { record, parsedLineItems };
}
