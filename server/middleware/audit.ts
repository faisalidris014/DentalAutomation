import { NextRequest } from 'next/server';
import { db } from '../db/connection';
import { auditLog } from '../db/schema';
import type { AuthContext } from './auth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- middleware boundary
export function withAudit(
  action: string,
  handler: (...args: any[]) => Promise<Response>,
): (...args: any[]) => Promise<Response> {
  return async (request: NextRequest, context: any) => {
    const response = await handler(request, context);

    // Fire-and-forget — don't block the response
    if (context?.user) {
      logAudit(request, context as AuthContext, action, response.status).catch((err) => {
        console.error('[Audit] Failed to write audit log:', err);
      });
    }

    return response;
  };
}

async function logAudit(
  request: NextRequest,
  context: AuthContext,
  action: string,
  statusCode: number,
): Promise<void> {
  const url = new URL(request.url);

  // Extract entity type and ID from the URL path
  const pathParts = url.pathname.replace('/api/', '').split('/');
  const entityType = pathParts[0] ?? null;
  const entityId = pathParts[1] && !pathParts[1].startsWith('[') ? pathParts[1] : null;

  await db.insert(auditLog).values({
    userId: context.user.id,
    clinicId: context.user.clinicId,
    action,
    entityType,
    entityId,
    details: {
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      statusCode,
    },
    ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip'),
    userAgent: request.headers.get('user-agent'),
  });
}
