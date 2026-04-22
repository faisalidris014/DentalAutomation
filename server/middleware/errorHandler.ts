import { NextRequest } from 'next/server';
import { AppError, ValidationError } from './errors';

const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g,                          // SSN
  /\b\(\d{3}\)\s?\d{3}-\d{4}\b/g,                     // Phone (xxx) xxx-xxxx
  /\b\d{3}\.\d{3}\.\d{4}\b/g,                         // Phone xxx.xxx.xxxx
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
  /\b(?:subscriber[_\s]?id|member[_\s]?id|medicaid[_\s]?id)[:\s]*[A-Z0-9-]+/gi, // Insurance IDs
  /\b(?:DOB|date[_\s]?of[_\s]?birth)[:\s]*\d{4}-\d{2}-\d{2}/gi, // DOB labels
];

function scrubPhi(message: string): string {
  let scrubbed = message;
  for (const pattern of PHI_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, '[REDACTED]');
  }
  return scrubbed;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- middleware boundary
type AnyHandler = (...args: any[]) => Promise<Response>;

type RouteHandler = (
  request: NextRequest,
  context?: { params?: Promise<Record<string, string>> },
) => Promise<Response>;

export function withErrorHandler(handler: AnyHandler): RouteHandler {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      if (error instanceof ValidationError) {
        return Response.json(
          {
            error: error.message,
            code: error.code,
            fieldErrors: error.fieldErrors,
          },
          { status: 400 },
        );
      }

      if (error instanceof AppError) {
        return Response.json(
          { error: error.message, code: error.code },
          { status: error.statusCode },
        );
      }

      // Unknown error — scrub PHI and return generic message
      const rawMessage = error instanceof Error ? error.message : String(error);
      console.error('[Server Error]', scrubPhi(rawMessage));

      return Response.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 },
      );
    }
  };
}
