import { eq, and, gte, sql } from 'drizzle-orm';
import { db } from '../../db/connection';
import { eobRecords } from '../../db/schema';

export interface WeeklyEobReport {
  periodStart: string;
  periodEnd: string;
  totalProcessed: number;
  totalAmountPosted: number;
  autoPosted: number;
  manuallyPosted: number;
  flaggedForReview: number;
  skipped: number;
  pending: number;
  flagReasonBreakdown: { reason: string; count: number }[];
  deniedClaims: number;
  deniedAmount: number;
}

export async function generateWeeklyReport(
  clinicId: string,
  periodDays: number = 7,
): Promise<WeeklyEobReport> {
  const periodStart = new Date(Date.now() - periodDays * 86400000);
  const periodEnd = new Date();

  const eobs = await db
    .select()
    .from(eobRecords)
    .where(
      and(
        eq(eobRecords.clinicId, clinicId),
        gte(eobRecords.createdAt, periodStart),
      ),
    );

  let totalAmountPosted = 0;
  let autoPosted = 0;
  let manuallyPosted = 0;
  let flaggedForReview = 0;
  let skipped = 0;
  let pending = 0;
  let deniedClaims = 0;
  let deniedAmount = 0;
  const reasonCounts = new Map<string, number>();

  for (const eob of eobs) {
    switch (eob.triageStatus) {
      case 'auto_post':
        autoPosted++;
        if (eob.postedToPms) totalAmountPosted += Number(eob.totalPaid ?? 0);
        break;
      case 'manually_posted':
        manuallyPosted++;
        totalAmountPosted += Number(eob.totalPaid ?? 0);
        break;
      case 'flagged_for_review':
        flaggedForReview++;
        break;
      case 'skipped':
        skipped++;
        break;
      default:
        pending++;
    }

    // Count flag reasons
    if (eob.triageReason) {
      const reasons = eob.triageReason.split('; ');
      for (const reason of reasons) {
        // Normalize reason to category
        const category = categorizeReason(reason);
        reasonCounts.set(category, (reasonCounts.get(category) ?? 0) + 1);
      }
    }

    // Count denied claims from line items
    const items = eob.lineItems as { denialCode?: string; paid?: number; fee?: number }[];
    if (Array.isArray(items)) {
      for (const item of items) {
        if (item.denialCode) {
          deniedClaims++;
          deniedAmount += item.fee ?? 0;
        }
      }
    }
  }

  const flagReasonBreakdown = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);

  return {
    periodStart: periodStart.toISOString().split('T')[0],
    periodEnd: periodEnd.toISOString().split('T')[0],
    totalProcessed: eobs.length,
    totalAmountPosted: Math.round(totalAmountPosted * 100) / 100,
    autoPosted,
    manuallyPosted,
    flaggedForReview,
    skipped,
    pending,
    flagReasonBreakdown,
    deniedClaims,
    deniedAmount: Math.round(deniedAmount * 100) / 100,
  };
}

function categorizeReason(reason: string): string {
  if (reason.includes('Patient not found')) return 'Patient not found';
  if (reason.includes('No matching claim')) return 'No matching claim';
  if (reason.includes('Zero pay')) return 'Zero payment';
  if (reason.includes('exceeds auto-post threshold')) return 'Exceeds threshold';
  if (reason.includes('Denial')) return 'Denied';
  if (reason.includes('Amount mismatch')) return 'Amount mismatch';
  return 'Other';
}
