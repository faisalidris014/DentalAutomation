import { eq, and, or, ilike, sql, desc } from 'drizzle-orm';
import { db } from '../db/connection';
import { claimsCache, patientsCache } from '../db/schema';
import { withErrorHandler } from '../middleware/errorHandler';
import { withAuth, getClinicScope } from '../middleware/auth';
import { withAudit } from '../middleware/audit';
import { NotFoundError } from '../middleware/errors';
import { parseQueryParams } from '../middleware/validators';

export const listClaims = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('list_claims', async (request, context) => {
      const url = new URL(request.url);
      const params = parseQueryParams(url);
      const clinicId = getClinicScope(context.user, params.clinicId);

      const conditions = [];
      if (clinicId) conditions.push(eq(claimsCache.clinicId, clinicId));
      if (params.status) conditions.push(eq(claimsCache.status, params.status));
      if (params.search) {
        conditions.push(
          or(
            ilike(claimsCache.payerName, `%${params.search}%`),
            ilike(claimsCache.pmsClaimId, `%${params.search}%`),
          ),
        );
      }

      const patientId = url.searchParams.get('patient_id');
      if (patientId) conditions.push(eq(claimsCache.patientId, patientId));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(claimsCache)
        .where(where);

      const claims = await db
        .select()
        .from(claimsCache)
        .where(where)
        .orderBy(desc(claimsCache.createdAt))
        .limit(params.limit)
        .offset(params.offset);

      // Join patient names
      const patientIds = [...new Set(claims.map(c => c.patientId).filter(Boolean))] as string[];
      const patients = patientIds.length > 0
        ? await db
            .select({ id: patientsCache.id, firstName: patientsCache.firstName, lastName: patientsCache.lastName })
            .from(patientsCache)
            .where(or(...patientIds.map(pid => eq(patientsCache.id, pid))))
        : [];
      const patientMap = new Map(patients.map(p => [p.id, `${p.firstName} ${p.lastName}`]));

      return Response.json({
        data: claims.map(c => ({
          ...c,
          patientName: c.patientId ? patientMap.get(c.patientId) ?? null : null,
        })),
        total: Number(countResult?.count ?? 0),
        limit: params.limit,
        offset: params.offset,
      });
    }),
  ),
);

export const getClaim = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('view_claim', async (_request, context) => {
      const params = context.params ? await context.params : {};
      const claimId = params.id;

      const [claim] = await db
        .select()
        .from(claimsCache)
        .where(eq(claimsCache.id, claimId))
        .limit(1);

      if (!claim) throw new NotFoundError('Claim');

      if (context.user.role !== 'it_admin' && claim.clinicId !== context.user.clinicId) {
        throw new NotFoundError('Claim');
      }

      // Get patient name
      let patientName: string | null = null;
      if (claim.patientId) {
        const [patient] = await db
          .select({ firstName: patientsCache.firstName, lastName: patientsCache.lastName })
          .from(patientsCache)
          .where(eq(patientsCache.id, claim.patientId))
          .limit(1);
        if (patient) patientName = `${patient.firstName} ${patient.lastName}`;
      }

      return Response.json({
        data: { ...claim, patientName },
      });
    }),
  ),
);
