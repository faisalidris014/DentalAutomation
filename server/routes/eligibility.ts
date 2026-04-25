import { NextRequest } from 'next/server';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { db } from '../db/connection';
import { eligibilityChecks, patientsCache } from '../db/schema';
import { withErrorHandler } from '../middleware/errorHandler';
import { withAuth, getClinicScope } from '../middleware/auth';
import { withAudit } from '../middleware/audit';
import { withValidation, verifyEligibilitySchema, parseQueryParams } from '../middleware/validators';
import { verifyPatientEligibility } from '../services/eligibility/engine';

// ─── GET /api/eligibility — History ─────────────────────────────────────────

export const listEligibilityHistory = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('list_eligibility', async (request, context) => {
      const url = new URL(request.url);
      const params = parseQueryParams(url);
      const clinicId = getClinicScope(context.user, params.clinicId);

      const conditions = [];
      if (clinicId) conditions.push(eq(eligibilityChecks.clinicId, clinicId));
      if (params.patientId) conditions.push(eq(eligibilityChecks.patientId, params.patientId));
      if (params.status) conditions.push(eq(eligibilityChecks.eligibilityResult, params.status));
      if (params.payerName) conditions.push(eq(eligibilityChecks.payerName, params.payerName));
      if (params.dateFrom) conditions.push(gte(eligibilityChecks.createdAt, new Date(params.dateFrom)));
      if (params.dateTo) conditions.push(lte(eligibilityChecks.createdAt, new Date(params.dateTo)));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(eligibilityChecks)
        .where(where);

      const items = await db
        .select({
          id: eligibilityChecks.id,
          clinicId: eligibilityChecks.clinicId,
          patientId: eligibilityChecks.patientId,
          insuranceId: eligibilityChecks.insuranceId,
          payerName: eligibilityChecks.payerName,
          payerType: eligibilityChecks.payerType,
          adapterUsed: eligibilityChecks.adapterUsed,
          trigger: eligibilityChecks.trigger,
          triggeredBy: eligibilityChecks.triggeredBy,
          status: eligibilityChecks.status,
          eligibilityResult: eligibilityChecks.eligibilityResult,
          effectiveDate: eligibilityChecks.effectiveDate,
          terminationDate: eligibilityChecks.terminationDate,
          managedCarePlan: eligibilityChecks.managedCarePlan,
          dentalCoverage: eligibilityChecks.dentalCoverage,
          resultDetails: eligibilityChecks.resultDetails,
          errorMessage: eligibilityChecks.errorMessage,
          writtenToPms: eligibilityChecks.writtenToPms,
          pmsWriteResult: eligibilityChecks.pmsWriteResult,
          durationMs: eligibilityChecks.durationMs,
          startedAt: eligibilityChecks.startedAt,
          completedAt: eligibilityChecks.completedAt,
          createdAt: eligibilityChecks.createdAt,
          // Join patient name
          patientFirstName: patientsCache.firstName,
          patientLastName: patientsCache.lastName,
        })
        .from(eligibilityChecks)
        .leftJoin(patientsCache, eq(eligibilityChecks.patientId, patientsCache.id))
        .where(where)
        .orderBy(desc(eligibilityChecks.createdAt))
        .limit(params.limit)
        .offset(params.offset);

      return Response.json({
        data: items,
        total: Number(countResult?.count ?? 0),
        limit: params.limit,
        offset: params.offset,
      });
    }),
  ),
);

// ─── POST /api/eligibility/verify — On-Demand Verification ─────────────────

export const verifyEligibility = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('verify_eligibility',
      withValidation(verifyEligibilitySchema, async (_request, context, data) => {
        const clinicId = getClinicScope(context.user, data.clinicId) ?? context.user.clinicId;

        if (!clinicId) {
          return Response.json({ error: 'clinic_id is required' }, { status: 400 });
        }

        const result = await verifyPatientEligibility({
          patientId: data.patientId,
          insuranceId: data.insuranceId,
          clinicId,
          trigger: 'on_demand',
          triggeredBy: context.user.id,
        });

        return Response.json({ data: result });
      }),
    ),
  ),
);

// ─── GET /api/eligibility/stats — Dashboard Stats ──────────────────────────

export const getEligibilityStats = withErrorHandler(
  withAuth(['it_admin', 'staff_admin'],
    withAudit('view_eligibility_stats', async (request, context) => {
      const url = new URL(request.url);
      const params = parseQueryParams(url);
      const clinicId = getClinicScope(context.user, params.clinicId);

      const clinicCondition = clinicId ? eq(eligibilityChecks.clinicId, clinicId) : undefined;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
      const recentCondition = gte(eligibilityChecks.createdAt, thirtyDaysAgo);
      const where = clinicCondition ? and(clinicCondition, recentCondition) : recentCondition;

      // Total checks in last 30 days
      const [totalResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(eligibilityChecks)
        .where(where);

      // By eligibility result
      const byStatus = await db
        .select({
          result: eligibilityChecks.eligibilityResult,
          count: sql<number>`count(*)`,
        })
        .from(eligibilityChecks)
        .where(where)
        .groupBy(eligibilityChecks.eligibilityResult);

      // By payer
      const byPayer = await db
        .select({
          payer: eligibilityChecks.payerName,
          count: sql<number>`count(*)`,
        })
        .from(eligibilityChecks)
        .where(where)
        .groupBy(eligibilityChecks.payerName);

      // Average duration
      const [avgResult] = await db
        .select({ avg: sql<number>`COALESCE(AVG(${eligibilityChecks.durationMs}), 0)` })
        .from(eligibilityChecks)
        .where(where);

      // Last batch run
      const [lastBatch] = await db
        .select({ lastRun: sql<string>`MAX(${eligibilityChecks.createdAt})` })
        .from(eligibilityChecks)
        .where(
          clinicCondition
            ? and(clinicCondition, eq(eligibilityChecks.trigger, 'batch_nightly'))
            : eq(eligibilityChecks.trigger, 'batch_nightly'),
        );

      return Response.json({
        data: {
          totalChecks: Number(totalResult?.count ?? 0),
          byStatus: Object.fromEntries(
            byStatus.map((r) => [r.result ?? 'null', Number(r.count)]),
          ),
          byPayer: Object.fromEntries(
            byPayer.map((r) => [r.payer, Number(r.count)]),
          ),
          avgDurationMs: Math.round(Number(avgResult?.avg ?? 0)),
          lastBatchRun: lastBatch?.lastRun ?? null,
        },
      });
    }),
  ),
);
