import { NextRequest } from 'next/server';
import { withErrorHandler } from '../middleware/errorHandler';
import { withAuth, getClinicScope } from '../middleware/auth';
import { withAudit } from '../middleware/audit';
import { NotFoundError } from '../middleware/errors';
import { parseQueryParams } from '../middleware/validators';
import {
  getJobsByClinic,
  getJobById,
  cancelJob as cancelJobFn,
  retryJob as retryJobFn,
} from '../services/queue/manager';

export const listJobs = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('list_jobs', async (request, context) => {
      const url = new URL(request.url);
      const params = parseQueryParams(url);
      const clinicId = getClinicScope(context.user, params.clinicId);

      const { items, total } = await getJobsByClinic(clinicId, {
        status: params.status,
        jobType: params.jobType,
        limit: params.limit,
        offset: params.offset,
      });

      return Response.json({
        data: items,
        total,
        limit: params.limit,
        offset: params.offset,
      });
    }),
  ),
);

export const getJob = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('view_job', async (_request, context) => {
      const params = context.params ? await context.params : {};
      const job = await getJobById(params.id);

      if (!job) throw new NotFoundError('Job');

      if (context.user.role !== 'it_admin' && job.clinicId !== context.user.clinicId) {
        throw new NotFoundError('Job');
      }

      return Response.json({ data: job });
    }),
  ),
);

export const cancelJob = withErrorHandler(
  withAuth(['it_admin', 'staff_admin'],
    withAudit('cancel_job', async (_request, context) => {
      const params = context.params ? await context.params : {};
      await cancelJobFn(params.id);
      return Response.json({ success: true });
    }),
  ),
);

export const retryJobHandler = withErrorHandler(
  withAuth(['it_admin', 'staff_admin'],
    withAudit('retry_job', async (_request, context) => {
      const params = context.params ? await context.params : {};
      const newJob = await retryJobFn(params.id);
      return Response.json({ data: newJob });
    }),
  ),
);
