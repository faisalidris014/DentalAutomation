import { NextRequest } from 'next/server';
import { verifyAccessToken, type JWTPayload } from '../services/auth/jwt';
import { AuthenticationError, AuthorizationError } from './errors';
import { ACCESS_TOKEN_COOKIE } from '@/lib/auth-cookies';

type Role = 'it_admin' | 'staff_admin' | 'staff_user';

export interface AuthContext {
  user: {
    id: string;
    email: string;
    role: Role;
    clinicId: string | null;
  };
}

export type HandlerWithAuth = (
  request: NextRequest,
  context: AuthContext & { params?: Promise<Record<string, string>> },
) => Promise<Response>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- middleware boundary
export function withAuth(
  allowedRoles: Role[],
  handler: HandlerWithAuth | ((...args: any[]) => Promise<Response>),
): (...args: any[]) => Promise<Response> {
  return async (request, routeContext) => {
    // Read token from cookie first, fall back to Authorization header
    const cookieToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
    const authHeader = request.headers.get('authorization');
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = cookieToken || headerToken;

    if (!token) {
      throw new AuthenticationError('Missing authentication');
    }
    let payload: JWTPayload;

    try {
      payload = await verifyAccessToken(token);
    } catch {
      throw new AuthenticationError('Invalid or expired token');
    }

    const role = payload.role as Role;
    if (!allowedRoles.includes(role)) {
      throw new AuthorizationError();
    }

    const authContext: AuthContext & { params?: Promise<Record<string, string>> } = {
      user: {
        id: payload.sub,
        email: payload.email,
        role,
        clinicId: payload.clinicId,
      },
      params: routeContext?.params,
    };

    return handler(request, authContext);
  };
}

export function getClinicScope(user: AuthContext['user'], requestedClinicId?: string | null): string | null {
  if (user.role === 'it_admin') {
    return requestedClinicId ?? null;
  }
  return user.clinicId;
}
