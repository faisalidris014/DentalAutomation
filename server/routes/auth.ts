import { NextRequest, NextResponse } from 'next/server';
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
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  accessTokenCookieOptions,
  refreshTokenCookieOptions,
} from '@/lib/auth-cookies';

const isProd = process.env.NODE_ENV === 'production';

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

    const response = NextResponse.json({
      accessToken,
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
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, accessTokenCookieOptions(isProd));
    response.cookies.set(REFRESH_TOKEN_COOKIE, refreshToken, refreshTokenCookieOptions(isProd));
    return response;
  }),
);

// POST /api/auth/refresh
export const refreshHandler = withErrorHandler(
  withValidation(refreshSchema, async (request, _context, data) => {
    const rt = data.refreshToken || request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    if (!rt) {
      throw new AuthenticationError('Missing refresh token');
    }

    try {
      const tokens = await rotateRefreshToken(rt);
      const response = NextResponse.json(tokens);
      response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, accessTokenCookieOptions(isProd));
      response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, refreshTokenCookieOptions(isProd));
      return response;
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }),
);

// POST /api/auth/logout
export const logoutHandler = withErrorHandler(
  withValidation(refreshSchema, async (request, _context, data) => {
    const rt = data.refreshToken || request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
    if (rt) {
      await revokeRefreshToken(rt).catch(() => {});
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(ACCESS_TOKEN_COOKIE, '', { ...accessTokenCookieOptions(isProd), maxAge: 0 });
    response.cookies.set(REFRESH_TOKEN_COOKIE, '', { ...refreshTokenCookieOptions(isProd), maxAge: 0 });
    return response;
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
