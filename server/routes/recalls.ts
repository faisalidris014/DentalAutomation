import { eq, and, sql, desc, lte } from 'drizzle-orm';
import { db } from '../db/connection';
import { patientsCache, notifications } from '../db/schema';
import { withErrorHandler } from '../middleware/errorHandler';
import { withAuth, getClinicScope } from '../middleware/auth';
import { withAudit } from '../middleware/audit';
import { parseQueryParams } from '../middleware/validators';
import { createJob } from '../services/queue/manager';

// Recalls are derived from patients with recall-related data.
// Since recalls live in the PMS and aren't cached locally, we derive
// recall-eligible patients from the patients cache and their last visit dates.

export const listRecalls = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('list_recalls', async (request, context) => {
      const url = new URL(request.url);
      const params = parseQueryParams(url);
      const clinicId = getClinicScope(context.user, params.clinicId);

      const conditions = [eq(patientsCache.status, 'active')];
      if (clinicId) conditions.push(eq(patientsCache.clinicId, clinicId));

      // Find patients who haven't been synced recently (proxy for overdue recall)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      conditions.push(
        lte(patientsCache.lastSyncedAt, sixMonthsAgo),
      );

      const where = and(...conditions);

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

      const today = new Date();
      const recalls = patients.map(p => {
        const lastVisit = p.lastSyncedAt ? new Date(p.lastSyncedAt) : new Date(p.createdAt!);
        const dueDate = new Date(lastVisit);
        dueDate.setMonth(dueDate.getMonth() + 6);
        const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

        return {
          id: `recall_${p.id}`,
          patientId: p.id,
          patientName: `${p.firstName} ${p.lastName}`,
          clinicId: p.clinicId,
          recallType: 'Prophy' as const,
          dueDate: dueDate.toISOString().split('T')[0],
          daysOverdue,
          reminderCount: 0,
          contactMethod: p.preferredContact ?? (p.email ? 'email' : 'phone'),
          status: 'pending' as const,
          phone: p.phoneCell ?? p.phoneHome ?? '',
          email: p.email ?? '',
        };
      });

      return Response.json({
        data: recalls,
        total: Number(countResult?.count ?? 0),
        limit: params.limit,
        offset: params.offset,
      });
    }),
  ),
);

export const sendReminder = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('send_recall_reminder', async (request, context) => {
      const body = await request.json();
      const { recallId, patientId } = body;

      // Queue a recall reminder job
      const job = await createJob({
        clinicId: context.user.clinicId!,
        jobType: 'recall_reminder',
        triggeredBy: context.user.id,
        triggerSource: 'manual',
        relatedEntityType: 'patient',
        relatedEntityId: patientId ?? recallId?.replace('recall_', ''),
      });

      return Response.json({ success: true, jobId: job.id });
    }),
  ),
);
