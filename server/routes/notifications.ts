import { NextRequest } from 'next/server';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../db/connection';
import { notifications } from '../db/schema';
import { withErrorHandler } from '../middleware/errorHandler';
import { withAuth, getClinicScope } from '../middleware/auth';
import { withAudit } from '../middleware/audit';
import { withValidation, updateNotificationSchema } from '../middleware/validators';
import { NotFoundError } from '../middleware/errors';
import { parseQueryParams } from '../middleware/validators';

export const listNotifications = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('list_notifications', async (request, context) => {
      const url = new URL(request.url);
      const params = parseQueryParams(url);
      const clinicId = getClinicScope(context.user, params.clinicId);

      const conditions = [];
      if (clinicId) conditions.push(eq(notifications.clinicId, clinicId));
      if (params.severity) conditions.push(eq(notifications.severity, params.severity));
      if (params.type) conditions.push(eq(notifications.type, params.type));
      if (params.isRead !== undefined) conditions.push(eq(notifications.isRead, params.isRead));

      // Filter by role visibility
      if (context.user.role === 'staff_user') {
        conditions.push(
          sql`${notifications.targetRoles} IS NULL OR ${notifications.targetRoles} @> '"staff_user"'::jsonb`,
        );
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(where);

      const items = await db
        .select()
        .from(notifications)
        .where(where)
        .orderBy(desc(notifications.createdAt))
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

export const updateNotification = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('update_notification',
      withValidation(updateNotificationSchema, async (_request, context, data) => {
        const params = context.params ? await context.params : {};
        const notifId = params.id;

        const updates: Record<string, unknown> = {};
        if (data.isRead !== undefined) {
          updates.isRead = data.isRead;
          if (data.isRead) updates.readAt = new Date();
        }
        if (data.isDismissed !== undefined) {
          updates.isDismissed = data.isDismissed;
        }

        const [updated] = await db
          .update(notifications)
          .set(updates)
          .where(eq(notifications.id, notifId))
          .returning();

        if (!updated) throw new NotFoundError('Notification');

        return Response.json({ data: updated });
      }),
    ),
  ),
);

export const markAllRead = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('mark_all_notifications_read', async (_request, context) => {
      const clinicId = context.user.clinicId;

      const conditions = [eq(notifications.isRead, false)];
      if (clinicId) conditions.push(eq(notifications.clinicId, clinicId));

      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(and(...conditions));

      return Response.json({ success: true });
    }),
  ),
);
