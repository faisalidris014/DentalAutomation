import { NextRequest } from 'next/server';
import { verifyAccessToken, type JWTPayload } from '../services/auth/jwt';
import { AuthenticationError, AuthorizationError } from './errors';

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
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
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
