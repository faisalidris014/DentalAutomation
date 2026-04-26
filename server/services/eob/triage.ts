import { eq, and } from 'drizzle-orm';
import { db } from '../../db/connection';
import { claimsCache, settings } from '../../db/schema';
import type { ParsedLineItem } from './parser';

export interface TriageResult {
  triageStatus: 'auto_post' | 'flagged_for_review';
  triageReason: string | null;
  flagReasons: string[];
}

async function getAutoPostThreshold(clinicId: string): Promise<number> {
  const [setting] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(
      and(
        eq(settings.clinicId, clinicId),
        eq(settings.category, 'eob'),
        eq(settings.key, 'auto_post_threshold'),
      ),
    )
    .limit(1);

  if (setting?.value && typeof setting.value === 'number') return setting.value;
  if (setting?.value && typeof setting.value === 'object' && 'amount' in (setting.value as Record<string, unknown>)) {
    return (setting.value as { amount: number }).amount;
  }
  return 250; // Default threshold
}

async function findMatchingClaim(
  lineItem: ParsedLineItem,
  clinicId: string,
): Promise<boolean> {
  if (!lineItem.patientCacheId) return false;

  const conditions = [
    eq(claimsCache.clinicId, clinicId),
    eq(claimsCache.patientId, lineItem.patientCacheId),
  ];

  // If we have a claim PMS ID from the EOB, use it directly
  if (lineItem.claimPmsId) {
    conditions.push(eq(claimsCache.pmsClaimId, lineItem.claimPmsId));
  }

  const matches = await db
    .select({ id: claimsCache.id })
    .from(claimsCache)
    .where(and(...conditions))
    .limit(1);

  return matches.length > 0;
}

export async function triageEobRecord(
  lineItems: ParsedLineItem[],
  clinicId: string,
  checkNumber: string | null,
): Promise<TriageResult> {
  const flagReasons: string[] = [];
  const threshold = await getAutoPostThreshold(clinicId);

  for (const item of lineItems) {
    // Rule 1: Patient must be found
    if (item.matchStatus === 'unmatched') {
      flagReasons.push(`Patient not found: ${item.patientName}`);
    }

    // Rule 2: Matching claim must exist
    if (item.matchStatus !== 'unmatched') {
      const hasMatch = await findMatchingClaim(item, clinicId);
      if (!hasMatch) {
        flagReasons.push(`No matching claim for ${item.patientName} - ${item.procedureCode} on ${item.serviceDate}`);
      }
    }

    // Rule 3: Paid amount must be > $0
    if (item.paid <= 0 && !item.denialCode) {
      flagReasons.push(`Zero pay for ${item.patientName} - ${item.procedureCode}`);
    }

    // Rule 4: Paid amount must be <= threshold
    if (item.paid > threshold) {
      flagReasons.push(`Paid amount $${item.paid} exceeds auto-post threshold of $${threshold} for ${item.procedureCode}`);
    }

    // Rule 5: No denial code
    if (item.denialCode) {
      flagReasons.push(`Denial ${item.denialCode}: ${item.denialReason ?? 'unknown reason'} for ${item.patientName} - ${item.procedureCode}`);
    }

    // Rule 6: Amounts must reconcile (allowed <= fee)
    if (item.allowed > item.fee) {
      flagReasons.push(`Amount mismatch: allowed ($${item.allowed}) > fee ($${item.fee}) for ${item.procedureCode}`);
    }
  }

  // Deduplicate reasons
  const uniqueReasons = [...new Set(flagReasons)];

  if (uniqueReasons.length === 0) {
    return {
      triageStatus: 'auto_post',
      triageReason: null,
      flagReasons: [],
    };
  }

  return {
    triageStatus: 'flagged_for_review',
    triageReason: uniqueReasons.join('; '),
    flagReasons: uniqueReasons,
  };
}
