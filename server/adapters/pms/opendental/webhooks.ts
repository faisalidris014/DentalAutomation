// ─── OpenDental Webhook Payload Parser ──────────────────────────────────────
//
// OpenDental API Events send webhooks with this structure:
//   { EventType: 'Created'|'Updated'|'Deleted', TableName: string, KeyNum: number, DateTimeEntry: string, ... }
//
// This parser normalizes those into a standard event format.

export interface ParsedWebhookEvent {
  eventType: string;    // e.g., 'appointment.created', 'patplan.updated'
  entityType: string;   // e.g., 'appointment', 'patplan', 'patient'
  entityId: string;
  timestamp: string;    // ISO datetime
  data: unknown;        // raw payload for reference
}

const TABLE_MAP: Record<string, string> = {
  appointment: 'appointment',
  appointments: 'appointment',
  patient: 'patient',
  patients: 'patient',
  patplan: 'patplan',
  patplans: 'patplan',
  inssub: 'inssub',
  insplan: 'insplan',
  carrier: 'carrier',
  carriers: 'carrier',
  claim: 'claim',
  claims: 'claim',
  claimproc: 'claimproc',
  claimprocs: 'claimproc',
};

const EVENT_MAP: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  deleted: 'deleted',
};

export function parseOpenDentalWebhook(rawPayload: unknown): ParsedWebhookEvent {
  const payload = rawPayload as Record<string, unknown>;

  const rawEventType = String(payload.EventType ?? '').toLowerCase();
  const rawTableName = String(payload.TableName ?? '').toLowerCase();
  const keyNum = payload.KeyNum;
  const dateTimeEntry = payload.DateTimeEntry;

  let entityType: string;
  let action: string;

  if (rawEventType.includes('.')) {
    // Combined format: "appointment.created" — split directly
    const [entity, act] = rawEventType.split('.');
    entityType = TABLE_MAP[entity] ?? entity;
    action = EVENT_MAP[act] ?? act;
  } else {
    // Raw OpenDental format: EventType="Created", TableName="appointment"
    entityType = TABLE_MAP[rawTableName] ?? rawTableName;
    action = EVENT_MAP[rawEventType] ?? rawEventType;
  }

  const eventType = `${entityType}.${action}`;
  const entityId = keyNum != null ? String(keyNum) : '';
  const timestamp = dateTimeEntry
    ? String(dateTimeEntry)
    : new Date().toISOString();

  return {
    eventType,
    entityType,
    entityId,
    timestamp,
    data: rawPayload,
  };
}
