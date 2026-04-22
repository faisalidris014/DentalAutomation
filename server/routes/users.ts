import { NextRequest } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/connection';
import { users } from '../db/schema';
import { hashPassword, validatePasswordStrength } from '../services/auth/passwords';
import { withErrorHandler } from '../middleware/errorHandler';
import { withAuth, getClinicScope } from '../middleware/auth';
import { withAudit } from '../middleware/audit';
import { withValidation, createUserSchema, updateUserSchema } from '../middleware/validators';
import { NotFoundError, ValidationError, AuthorizationError } from '../middleware/errors';

export const listUsers = withErrorHandler(
  withAuth(['it_admin', 'staff_admin'],
    withAudit('list_users', async (request, context) => {
      const url = new URL(request.url);
      const clinicId = getClinicScope(context.user, url.searchParams.get('clinic_id') ?? undefined);

      const conditions = [];
      if (clinicId) conditions.push(eq(users.clinicId, clinicId));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const allUsers = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          clinicId: users.clinicId,
          isActive: users.isActive,
          lastLoginAt: users.lastLoginAt,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(where);

      return Response.json({ data: allUsers });
    }),
  ),
);

export const createUser = withErrorHandler(
  withAuth(['it_admin', 'staff_admin'],
    withAudit('create_user',
      withValidation(createUserSchema, async (_request, context, data) => {
        // Staff admin can only create users in their clinic
        if (context.user.role === 'staff_admin') {
          if (data.role === 'it_admin') {
            throw new AuthorizationError('Staff admins cannot create IT admin users');
          }
          if (data.clinicId && data.clinicId !== context.user.clinicId) {
            throw new AuthorizationError('Cannot create users for other clinics');
          }
          data.clinicId = context.user.clinicId;
        }

        const strength = validatePasswordStrength(data.password);
        if (!strength.valid) {
          throw new ValidationError('Password too weak', { password: strength.errors });
        }

        const passwordHash = await hashPassword(data.password);

        const [user] = await db.insert(users).values({
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          clinicId: data.clinicId ?? null,
        }).returning({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role,
          clinicId: users.clinicId,
          createdAt: users.createdAt,
        });

        return Response.json({ data: user }, { status: 201 });
      }),
    ),
  ),
);

export const updateUser = withErrorHandler(
  withAuth(['it_admin', 'staff_admin'],
    withAudit('update_user',
      withValidation(updateUserSchema, async (_request, context, data) => {
        const params = context.params ? await context.params : {};
        const userId = params.id;

        const [updated] = await db
          .update(users)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(users.id, userId))
          .returning({
            id: users.id,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            role: users.role,
            clinicId: users.clinicId,
            isActive: users.isActive,
          });

        if (!updated) throw new NotFoundError('User');

        return Response.json({ data: updated });
      }),
    ),
  ),
);
