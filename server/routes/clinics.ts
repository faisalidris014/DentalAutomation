import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { clinics } from '../db/schema';
import { withErrorHandler } from '../middleware/errorHandler';
import { withAuth, getClinicScope } from '../middleware/auth';
import { withAudit } from '../middleware/audit';
import { withValidation, createClinicSchema, updateClinicSchema } from '../middleware/validators';
import { NotFoundError } from '../middleware/errors';
import { getAdapter } from '../adapters/pms/registry';

export const listClinics = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('list_clinics', async (_request, context) => {
      if (context.user.role === 'it_admin') {
        const allClinics = await db.select().from(clinics);
        return Response.json({ data: allClinics });
      }

      if (!context.user.clinicId) {
        return Response.json({ data: [] });
      }

      const [clinic] = await db
        .select()
        .from(clinics)
        .where(eq(clinics.id, context.user.clinicId))
        .limit(1);

      return Response.json({ data: clinic ? [clinic] : [] });
    }),
  ),
);

export const createClinic = withErrorHandler(
  withAuth(['it_admin'],
    withAudit('create_clinic',
      withValidation(createClinicSchema, async (_request, _context, data) => {
        const [clinic] = await db.insert(clinics).values({
          name: data.name,
          address: data.address,
          city: data.city,
          state: data.state,
          zip: data.zip,
          phone: data.phone,
          npi: data.npi,
          pmsType: data.pmsType,
          pmsConfig: data.pmsConfig,
          timezone: data.timezone,
        }).returning();

        return Response.json({ data: clinic }, { status: 201 });
      }),
    ),
  ),
);

export const getClinic = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('view_clinic', async (_request, context) => {
      const params = context.params ? await context.params : {};
      const clinicId = params.id;

      // Scope check
      if (context.user.role !== 'it_admin' && context.user.clinicId !== clinicId) {
        throw new NotFoundError('Clinic');
      }

      const [clinic] = await db
        .select()
        .from(clinics)
        .where(eq(clinics.id, clinicId))
        .limit(1);

      if (!clinic) throw new NotFoundError('Clinic');

      return Response.json({ data: clinic });
    }),
  ),
);

export const updateClinic = withErrorHandler(
  withAuth(['it_admin'],
    withAudit('update_clinic',
      withValidation(updateClinicSchema, async (_request, context, data) => {
        const params = context.params ? await context.params : {};
        const clinicId = params.id;

        const [updated] = await db
          .update(clinics)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(clinics.id, clinicId))
          .returning();

        if (!updated) throw new NotFoundError('Clinic');

        return Response.json({ data: updated });
      }),
    ),
  ),
);

export const checkClinicHealth = withErrorHandler(
  withAuth(['it_admin', 'staff_admin'],
    withAudit('check_clinic_health', async (_request, context) => {
      const params = context.params ? await context.params : {};
      const clinicId = params.id;

      const [clinic] = await db
        .select()
        .from(clinics)
        .where(eq(clinics.id, clinicId))
        .limit(1);

      if (!clinic) throw new NotFoundError('Clinic');

      try {
        const adapter = getAdapter(clinic);
        const result = await adapter.testConnection();
        return Response.json({ data: result });
      } catch (err) {
        return Response.json({
          data: {
            connected: false,
            error: err instanceof Error ? err.message : 'Connection test failed',
          },
        });
      }
    }),
  ),
);
