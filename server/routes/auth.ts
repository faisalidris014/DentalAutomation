import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '../db/connection';
import { users, clinics } from '../db/schema';
import { comparePassword, hashPassword, validatePasswordStrength } from '../services/auth/passwords';
import { generateAccessToken } from '../services/auth/jwt';
import { createRefreshToken, rotateRefreshToken, revokeRefreshToken } from '../services/auth/sessions';
import { withErrorHandler } from '../middleware/errorHandler';
import { withAuth, type AuthContext } from '../middleware/auth';
import { withValidation, loginSchema, refreshSchema } from '../middleware/validators';
import { withAudit } from '../middleware/audit';
import { AuthenticationError } from '../middleware/errors';

// POST /api/auth/login
export const loginHandler = withErrorHandler(
  withValidation(loginSchema, async (_request, _context, data) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (!user || !user.isActive) {
      throw new AuthenticationError('Invalid email or password');
    }

    const valid = await comparePassword(data.password, user.passwordHash);
    if (!valid) {
      throw new AuthenticationError('Invalid email or password');
    }

    const accessToken = await generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      clinicId: user.clinicId,
    });

    const refreshToken = await createRefreshToken(user.id);

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));

    return Response.json({
      token: accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        clinicId: user.clinicId,
      },
    });
  }),
);

// POST /api/auth/refresh
export const refreshHandler = withErrorHandler(
  withValidation(refreshSchema, async (_request, _context, data) => {
    try {
      const tokens = await rotateRefreshToken(data.refreshToken);
      return Response.json(tokens);
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }),
);

// POST /api/auth/logout
export const logoutHandler = withErrorHandler(
  withValidation(refreshSchema, async (_request, _context, data) => {
    await revokeRefreshToken(data.refreshToken);
    return Response.json({ success: true });
  }),
);

// GET /api/auth/me
export const meHandler = withErrorHandler(
  withAuth(['it_admin', 'staff_admin', 'staff_user'],
    withAudit('auth_me', async (_request, context) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, context.user.id))
        .limit(1);

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      let clinic = null;
      if (user.clinicId) {
        const [c] = await db
          .select()
          .from(clinics)
          .where(eq(clinics.id, user.clinicId))
          .limit(1);
        clinic = c ?? null;
      }

      return Response.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          clinicId: user.clinicId,
          clinic: clinic ? {
            id: clinic.id,
            name: clinic.name,
            address: clinic.address,
            city: clinic.city,
            state: clinic.state,
            zip: clinic.zip,
            phone: clinic.phone,
            npi: clinic.npi,
            status: clinic.status,
          } : null,
        },
      });
    }),
  ),
);
