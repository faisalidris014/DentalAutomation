import { NextRequest } from 'next/server';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/connection';
import { settings, payerConfigs } from '../db/schema';
import { withErrorHandler } from '../middleware/errorHandler';
import { withAuth, getClinicScope } from '../middleware/auth';
import { withAudit } from '../middleware/audit';
import { withValidation, updateSettingsSchema, updatePayerConfigSchema } from '../middleware/validators';
import { NotFoundError } from '../middleware/errors';
import { encrypt } from '../services/encryption/credentials';
import { parseQueryParams } from '../middleware/validators';

export const getSettings = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('view_settings', async (request, context) => {
      const url = new URL(request.url);
      const params = parseQueryParams(url);
      const clinicId = getClinicScope(context.user, params.clinicId);

      // Get system-wide settings
      const systemSettings = await db
        .select()
        .from(settings)
        .where(
          and(
            isNull(settings.clinicId),
            params.category ? eq(settings.category, params.category) : undefined,
          ),
        );

      // Get clinic-specific settings
      const clinicSettings = clinicId
        ? await db
            .select()
            .from(settings)
            .where(
              and(
                eq(settings.clinicId, clinicId),
                params.category ? eq(settings.category, params.category) : undefined,
              ),
            )
        : [];

      // Merge: clinic settings override system settings
      const merged = new Map<string, typeof settings.$inferSelect>();
      for (const s of systemSettings) merged.set(`${s.category}:${s.key}`, s);
      for (const s of clinicSettings) merged.set(`${s.category}:${s.key}`, s);

      return Response.json({ data: Array.from(merged.values()) });
    }),
  ),
);

export const updateSettings = withErrorHandler(
  withAuth(['it_admin', 'staff_admin'],
    withAudit('update_settings',
      withValidation(updateSettingsSchema, async (_request, context, data) => {
        const clinicId = data.clinicId ?? getClinicScope(context.user) ?? null;

        // Upsert
        const conditions = [
          eq(settings.category, data.category),
          eq(settings.key, data.key),
        ];
        if (clinicId) {
          conditions.push(eq(settings.clinicId, clinicId));
        } else {
          conditions.push(isNull(settings.clinicId));
        }

        const [existing] = await db
          .select()
          .from(settings)
          .where(and(...conditions))
          .limit(1);

        if (existing) {
          const [updated] = await db
            .update(settings)
            .set({
              value: data.value,
              updatedBy: context.user.id,
              updatedAt: new Date(),
            })
            .where(eq(settings.id, existing.id))
            .returning();

          return Response.json({ data: updated });
        }

        const [created] = await db.insert(settings).values({
          clinicId,
          category: data.category,
          key: data.key,
          value: data.value,
          updatedBy: context.user.id,
        }).returning();

        return Response.json({ data: created }, { status: 201 });
      }),
    ),
  ),
);

export const listPayerConfigs = withErrorHandler(
  withAuth(['it_admin', 'staff_admin'],
    withAudit('list_payer_configs', async (request, context) => {
      const url = new URL(request.url);
      const clinicId = getClinicScope(context.user, url.searchParams.get('clinic_id') ?? undefined);

      if (!clinicId) {
        return Response.json({ data: [] });
      }

      const configs = await db
        .select({
          id: payerConfigs.id,
          clinicId: payerConfigs.clinicId,
          payerName: payerConfigs.payerName,
          payerType: payerConfigs.payerType,
          state: payerConfigs.state,
          adapterKey: payerConfigs.adapterKey,
          portalUrl: payerConfigs.portalUrl,
          isEnabled: payerConfigs.isEnabled,
          autoVerify: payerConfigs.autoVerify,
          timeoutMs: payerConfigs.timeoutMs,
          maxRetries: payerConfigs.maxRetries,
          featuresEnabled: payerConfigs.featuresEnabled,
          lastHealthCheck: payerConfigs.lastHealthCheck,
          healthStatus: payerConfigs.healthStatus,
          createdAt: payerConfigs.createdAt,
          updatedAt: payerConfigs.updatedAt,
          // credentials intentionally excluded
        })
        .from(payerConfigs)
        .where(eq(payerConfigs.clinicId, clinicId));

      return Response.json({ data: configs });
    }),
  ),
);

export const updatePayerConfig = withErrorHandler(
  withAuth(['it_admin', 'staff_admin'],
    withAudit('update_payer_config',
      withValidation(updatePayerConfigSchema, async (_request, context, data) => {
        const params = context.params ? await context.params : {};
        const configId = params.id;

        const updates: Record<string, unknown> = { ...data, updatedAt: new Date() };

        // Encrypt credentials if provided
        if (data.credentials) {
          updates.credentials = encrypt(data.credentials);
        }

        const [updated] = await db
          .update(payerConfigs)
          .set(updates)
          .where(eq(payerConfigs.id, configId))
          .returning({
            id: payerConfigs.id,
            payerName: payerConfigs.payerName,
            isEnabled: payerConfigs.isEnabled,
            autoVerify: payerConfigs.autoVerify,
            healthStatus: payerConfigs.healthStatus,
            updatedAt: payerConfigs.updatedAt,
          });

        if (!updated) throw new NotFoundError('Payer config');

        return Response.json({ data: updated });
      }),
    ),
  ),
);
