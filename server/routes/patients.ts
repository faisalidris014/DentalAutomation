import { NextRequest } from 'next/server';
import { eq, and, or, ilike, sql, desc } from 'drizzle-orm';
import { db } from '../db/connection';
import { patientsCache, insuranceCache, claimsCache } from '../db/schema';
import { withErrorHandler } from '../middleware/errorHandler';
import { withAuth, getClinicScope, type AuthContext } from '../middleware/auth';
import { withAudit } from '../middleware/audit';
import { NotFoundError } from '../middleware/errors';
import { parseQueryParams } from '../middleware/validators';

export const listPatients = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('list_patients', async (request, context) => {
      const url = new URL(request.url);
      const params = parseQueryParams(url);
      const clinicId = getClinicScope(context.user, params.clinicId);

      const conditions = [];
      if (clinicId) conditions.push(eq(patientsCache.clinicId, clinicId));
      if (params.search) {
        conditions.push(
          or(
            ilike(patientsCache.firstName, `%${params.search}%`),
            ilike(patientsCache.lastName, `%${params.search}%`),
            ilike(patientsCache.email, `%${params.search}%`),
          ),
        );
      }
      if (params.status) conditions.push(eq(patientsCache.status, params.status));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(patientsCache)
        .where(where);

      const patients = await db
        .select()
        .from(patientsCache)
        .where(where)
        .orderBy(desc(patientsCache.updatedAt))
        .limit(params.limit)
        .offset(params.offset);

      // Get primary insurance for each patient
      const patientIds = patients.map((p) => p.id);
      const insurance = patientIds.length > 0
        ? await db
            .select()
            .from(insuranceCache)
            .where(
              and(
                sql`${insuranceCache.patientId} = ANY(${patientIds})`,
                eq(insuranceCache.ordinal, 1),
              ),
            )
        : [];

      const insuranceMap = new Map(insurance.map((i) => [i.patientId, i]));

      return Response.json({
        data: patients.map((p) => ({
          ...p,
          primaryInsurance: insuranceMap.get(p.id) ?? null,
        })),
        total: Number(countResult?.count ?? 0),
        limit: params.limit,
        offset: params.offset,
      });
    }),
  ),
);

export const getPatient = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('view_patient', async (_request, context) => {
      const params = context.params ? await context.params : {};
      const patientId = params.id;

      const [patient] = await db
        .select()
        .from(patientsCache)
        .where(eq(patientsCache.id, patientId))
        .limit(1);

      if (!patient) throw new NotFoundError('Patient');

      // Clinic scope check
      if (context.user.role !== 'it_admin' && patient.clinicId !== context.user.clinicId) {
        throw new NotFoundError('Patient');
      }

      // Get insurance
      const insurance = await db
        .select()
        .from(insuranceCache)
        .where(eq(insuranceCache.patientId, patientId));

      // Get recent claims
      const claims = await db
        .select()
        .from(claimsCache)
        .where(eq(claimsCache.patientId, patientId))
        .orderBy(desc(claimsCache.createdAt))
        .limit(10);

      return Response.json({
        data: {
          ...patient,
          insurance,
          recentClaims: claims,
        },
      });
    }),
  ),
);
