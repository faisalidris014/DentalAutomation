import { NextRequest } from 'next/server';
import { withErrorHandler } from '../middleware/errorHandler';
import { parseOpenDentalWebhook } from '../adapters/pms/opendental/webhooks';
import { createJob } from '../services/queue/manager';
import { config } from '../config';

// ─── Webhook Security ──────────────────────────────────────────────────────

function verifyWebhookSecret(request: NextRequest): boolean {
  const configuredSecret = config.webhooks.secret;

  if (!configuredSecret) {
    console.warn('[Webhooks] WEBHOOK_SECRET not configured — accepting all requests. Set WEBHOOK_SECRET in production.');
    return true;
  }

  const headerSecret = request.headers.get('x-webhook-secret');
  if (headerSecret === configuredSecret) return true;

  // Also check query param as fallback (some webhook senders use URL params)
  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  if (querySecret === configuredSecret) return true;

  return false;
}

function validatePayloadStructure(payload: unknown): payload is Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return false;

  const p = payload as Record<string, unknown>;
  if (!p.EventType || typeof p.EventType !== 'string') return false;
  if (!p.TableName || typeof p.TableName !== 'string') return false;
  if (p.KeyNum == null) return false;

  return true;
}

// ─── Event → Job Mapping ───────────────────────────────────────────────────

const ELIGIBILITY_EVENTS = new Set([
  'appointment.created',
  'appointment.updated',
  'patplan.created',
  'patplan.updated',
]);

// ─── POST /api/webhooks/opendental ─────────────────────────────────────────

export const handleOpenDentalWebhook = withErrorHandler(
  async (request: NextRequest) => {
    // 1. Verify webhook secret
    if (!verifyWebhookSecret(request)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // 3. Validate payload structure
    if (!validatePayloadStructure(body)) {
      return Response.json(
        { error: 'Invalid payload: EventType, TableName, and KeyNum are required' },
        { status: 400 },
      );
    }

    // 4. Parse event
    const event = parseOpenDentalWebhook(body);

    // 5. Route to appropriate job
    let matched = false;

    if (ELIGIBILITY_EVENTS.has(event.eventType)) {
      const clinicId = body.ClinicId ? String(body.ClinicId) : undefined;

      if (clinicId) {
        await createJob({
          clinicId,
          jobType: 'webhook_process',
          triggerSource: 'webhook',
          relatedEntityType: event.entityType,
        });
        matched = true;
      } else {
        console.warn(`[Webhooks] ${event.eventType} received without ClinicId — cannot route to job`);
      }
    }

    // 6. Return 200 immediately (OpenDental retries for up to 3 days)
    if (!matched) {
      return Response.json({ received: true, matched: false, reason: 'unrecognized event type' });
    }
    return Response.json({ received: true });
  },
);
