import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { clinics } from '../db/schema';
import { getAdapter } from '../adapters/pms/registry';
import { withErrorHandler } from '../middleware/errorHandler';
import { withAuth, getClinicScope } from '../middleware/auth';
import { withAudit } from '../middleware/audit';
import { parseQueryParams } from '../middleware/validators';

export const listAppointments = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('list_appointments', async (request, context) => {
      const url = new URL(request.url);
      const params = parseQueryParams(url);
      const clinicId = getClinicScope(context.user, params.clinicId);

      if (!clinicId) {
        return Response.json({ data: [], message: 'clinic_id required' }, { status: 400 });
      }

      const [clinic] = await db
        .select()
        .from(clinics)
        .where(eq(clinics.id, clinicId))
        .limit(1);

      if (!clinic) {
        return Response.json({ data: [], message: 'Clinic not found' }, { status: 404 });
      }

      // Query PMS adapter live
      const today = new Date().toISOString().split('T')[0];
      const dateFrom = params.dateFrom ?? today;
      const dateTo = params.dateTo ?? today;

      try {
        const adapter = getAdapter(clinic);
        const result = await adapter.getAppointments({ dateFrom, dateTo });

        return Response.json({
          data: result.items,
          total: result.totalCount,
        });
      } catch (err) {
        // Fall back to empty if PMS is unreachable
        console.error('[Appointments] PMS query failed:', err);
        return Response.json({
          data: [],
          total: 0,
          error: 'Unable to reach PMS. Appointments are queried live.',
        });
      }
    }),
  ),
);
