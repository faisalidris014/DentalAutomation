export type JobType =
  | 'sync_patients'
  | 'sync_appointments'
  | 'sync_insurance'
  | 'sync_claims'
  | 'eligibility_batch'
  | 'eligibility_single'
  | 'eligibility_recheck'
  | 'eob_sync'
  | 'eob_post'
  | 'eob_report'
  | 'webhook_process'
  | 'recall_reminder';

export interface ExecutionLogEntry {
  step: number;
  action: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  message: string;
  timestamp: string;
  durationMs?: number;
  data?: unknown;
}

export interface CreateJobParams {
  clinicId: string;
  jobType: JobType;
  priority?: number;
  triggeredBy?: string | null;
  triggerSource?: 'scheduler' | 'webhook' | 'manual' | 'retry';
  totalItems?: number;
  relatedEntityType?: string;
  relatedEntityId?: string;
}
