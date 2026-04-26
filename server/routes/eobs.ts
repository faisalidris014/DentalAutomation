import { eq, and, or, ilike, sql, desc } from 'drizzle-orm';
import { db } from '../db/connection';
import { eobRecords, patientsCache } from '../db/schema';
import { withErrorHandler } from '../middleware/errorHandler';
import { withAuth, getClinicScope } from '../middleware/auth';
import { withAudit } from '../middleware/audit';
import { NotFoundError } from '../middleware/errors';
import { parseQueryParams } from '../middleware/validators';
import { createJob } from '../services/queue/manager';
import { reviewEob as reviewEobAction, postEobToPms } from '../services/eob/engine';

export const listEobs = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('list_eobs', async (request, context) => {
      const url = new URL(request.url);
      const params = parseQueryParams(url);
      const clinicId = getClinicScope(context.user, params.clinicId);

      const conditions = [];
      if (clinicId) conditions.push(eq(eobRecords.clinicId, clinicId));

      const triageStatus = url.searchParams.get('triage_status');
      if (triageStatus) conditions.push(eq(eobRecords.triageStatus, triageStatus));

      if (params.search) {
        conditions.push(
          or(
            ilike(eobRecords.payerName, `%${params.search}%`),
            ilike(eobRecords.checkNumber, `%${params.search}%`),
          ),
        );
      }

      const patientId = url.searchParams.get('patient_id');
      if (patientId) conditions.push(eq(eobRecords.patientId, patientId));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(eobRecords)
        .where(where);

      const eobs = await db
        .select()
        .from(eobRecords)
        .where(where)
        .orderBy(desc(eobRecords.createdAt))
        .limit(params.limit)
        .offset(params.offset);

      // Join patient names
      const patientIds = [...new Set(eobs.map(e => e.patientId).filter(Boolean))] as string[];
      const patients = patientIds.length > 0
        ? await db
            .select({ id: patientsCache.id, firstName: patientsCache.firstName, lastName: patientsCache.lastName })
            .from(patientsCache)
            .where(or(...patientIds.map(pid => eq(patientsCache.id, pid))))
        : [];
      const patientMap = new Map(patients.map(p => [p.id, `${p.firstName} ${p.lastName}`]));

      return Response.json({
        data: eobs.map(e => ({
          ...e,
          patientName: e.patientId ? patientMap.get(e.patientId) ?? null : null,
        })),
        total: Number(countResult?.count ?? 0),
        limit: params.limit,
        offset: params.offset,
      });
    }),
  ),
);

export const getEob = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('view_eob', async (_request, context) => {
      const params = context.params ? await context.params : {};
      const eobId = params.id;

      const [eob] = await db
        .select()
        .from(eobRecords)
        .where(eq(eobRecords.id, eobId))
        .limit(1);

      if (!eob) throw new NotFoundError('EOB');

      if (context.user.role !== 'it_admin' && eob.clinicId !== context.user.clinicId) {
        throw new NotFoundError('EOB');
      }

      let patientName: string | null = null;
      if (eob.patientId) {
        const [patient] = await db
          .select({ firstName: patientsCache.firstName, lastName: patientsCache.lastName })
          .from(patientsCache)
          .where(eq(patientsCache.id, eob.patientId))
          .limit(1);
        if (patient) patientName = `${patient.firstName} ${patient.lastName}`;
      }

      return Response.json({
        data: { ...eob, patientName },
      });
    }),
  ),
);

export const triggerEobSync = withErrorHandler(
  withAuth(['it_admin', 'staff_admin'],
    withAudit('trigger_eob_sync', async (request, context) => {
      const clinicId = context.user.role === 'it_admin'
        ? ((await request.json()).clinic_id ?? context.user.clinicId)
        : context.user.clinicId;

      const job = await createJob({
        clinicId,
        jobType: 'eob_sync',
        triggeredBy: context.user.id,
        triggerSource: 'manual',
      });

      return Response.json({ data: job }, { status: 202 });
    }),
  ),
);

export const reviewEob = withErrorHandler(
  withAuth(['it_admin', 'staff_admin'],
    withAudit('review_eob', async (request, context) => {
      const params = context.params ? await context.params : {};
      const eobId = params.id;
      const body = await request.json();
      const action = body.action as 'approve' | 'reject';
      const notes = body.notes as string | undefined;

      if (!action || !['approve', 'reject'].includes(action)) {
        return Response.json({ error: 'Invalid action. Must be "approve" or "reject".' }, { status: 400 });
      }

      const clinicId = context.user.role === 'it_admin'
        ? (body.clinic_id ?? context.user.clinicId)
        : context.user.clinicId;

      const updated = await reviewEobAction(eobId, clinicId, context.user.id, action, notes);

      return Response.json({ data: updated });
    }),
  ),
);

export const postEob = withErrorHandler(
  withAuth(['it_admin', 'staff_admin'],
    withAudit('post_eob', async (request, context) => {
      const params = context.params ? await context.params : {};
      const eobId = params.id;

      const clinicId = context.user.role === 'it_admin'
        ? ((await request.json().catch(() => ({}))).clinic_id ?? context.user.clinicId)
        : context.user.clinicId;

      const result = await postEobToPms(eobId, clinicId);

      if (!result.success) {
        return Response.json({ error: result.error ?? 'Failed to post EOB' }, { status: 500 });
      }

      return Response.json({ data: result });
    }),
  ),
);
