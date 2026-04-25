import { NextRequest } from 'next/server';
import { z } from 'zod';
import type { AuthContext } from './auth';
import { ValidationError } from './errors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- middleware boundary
type HandlerWithValidation<T> = (
  request: NextRequest,
  context: any,
  data: T,
) => Promise<Response>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: HandlerWithValidation<T>,
): (...args: any[]) => Promise<Response> {
  return async (request: NextRequest, context: any) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new ValidationError('Invalid JSON body');
    }

    const result = schema.safeParse(body);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join('.');
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push(issue.message);
      }
      throw new ValidationError('Validation failed', fieldErrors);
    }

    return handler(request, context, result.data);
  };
}

// ─── Shared Schemas ─────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['it_admin', 'staff_admin', 'staff_user']),
  clinicId: z.string().uuid().nullable().optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  role: z.enum(['it_admin', 'staff_admin', 'staff_user']).optional(),
  isActive: z.boolean().optional(),
});

export const createClinicSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  npi: z.string().optional(),
  pmsType: z.string().min(1),
  pmsConfig: z.record(z.string(), z.unknown()),
  timezone: z.string().optional(),
});

export const updateClinicSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().max(2).optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  npi: z.string().optional(),
  pmsConfig: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(['active', 'inactive', 'setup']).optional(),
  timezone: z.string().optional(),
});

export const updateSettingsSchema = z.object({
  clinicId: z.string().uuid().nullable().optional(),
  category: z.string().min(1),
  key: z.string().min(1),
  value: z.unknown(),
});

export const updateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
  isDismissed: z.boolean().optional(),
});

export const updatePayerConfigSchema = z.object({
  isEnabled: z.boolean().optional(),
  autoVerify: z.boolean().optional(),
  credentials: z.string().optional(),
  portalUrl: z.string().url().optional(),
  timeoutMs: z.number().int().positive().optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  featuresEnabled: z.record(z.string(), z.boolean()).optional(),
});

export const eobReviewSchema = z.object({
  triageStatus: z.enum(['auto_posted', 'flagged_for_review', 'manually_posted', 'skipped']),
  reviewNotes: z.string().optional(),
});

export const verifyEligibilitySchema = z.object({
  patientId: z.string().uuid(),
  insuranceId: z.string().uuid(),
  clinicId: z.string().uuid().optional(), // only for it_admin override
});

export function parseQueryParams(url: URL) {
  return {
    clinicId: url.searchParams.get('clinic_id') ?? undefined,
    search: url.searchParams.get('search') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    limit: Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 100),
    offset: parseInt(url.searchParams.get('offset') ?? '0', 10),
    dateFrom: url.searchParams.get('date_from') ?? undefined,
    dateTo: url.searchParams.get('date_to') ?? undefined,
    severity: url.searchParams.get('severity') ?? undefined,
    isRead: url.searchParams.get('is_read') === 'true' ? true
      : url.searchParams.get('is_read') === 'false' ? false : undefined,
    category: url.searchParams.get('category') ?? undefined,
    jobType: url.searchParams.get('job_type') ?? undefined,
    payerName: url.searchParams.get('payer') ?? undefined,
    triageStatus: url.searchParams.get('triage_status') ?? undefined,
    patientId: url.searchParams.get('patient_id') ?? undefined,
    type: url.searchParams.get('type') ?? undefined,
  };
}
