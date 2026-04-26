# Background Jobs Guide

## Overview

DentalFlow uses a PostgreSQL-backed job queue for async operations. Jobs are stored in the `jobs` table and processed by a worker invoked via `POST /api/internal/worker`. There is no persistent worker process -- an external scheduler (cron, Vercel Cron Jobs) calls the endpoint on an interval to dequeue and execute one job per invocation.

## Job Types

There are 12 job types defined in `server/services/queue/types.ts`:

| Job Type | Status | Description |
|----------|--------|-------------|
| `sync_patients` | Active | Syncs patient demographics from PMS to patients_cache |
| `sync_insurance` | Active | Full sync: patients + insurance plans from PMS |
| `sync_appointments` | Stub | Appointments queried live, no cache |
| `sync_claims` | Active | Syncs claims from PMS to claims_cache table (prerequisite for EOB triage) |
| `eligibility_batch` | Active | Batch verification for all stale insurance in a clinic |
| `eligibility_single` | Active | Single patient eligibility verification (usually webhook-triggered) |
| `eligibility_recheck` | Active | Day-of-service recheck for patients with appointments today |
| `eob_sync` | Active | Retrieves EOBs from payer adapters, parses, triages, and auto-posts eligible records |
| `eob_post` | Active | Posts a specific EOB to PMS (uses `relatedEntityId` for the EOB record ID) |
| `eob_report` | Active | Generates weekly EOB processing summary report (counts by status, dollars posted, flagged items) |
| `webhook_process` | Active | Webhook event acknowledgment (real work done by other job types) |
| `recall_reminder` | Active | Queue a recall reminder for an overdue patient (triggered from recalls UI) |

## Job Lifecycle

```
queued -> running -> completed
                  -> failed (retryCount >= maxRetries)
                  -> retrying -> queued (new attempt, same row)
                  -> cancelled (via API)
```

## Creating Jobs

File: `server/services/queue/manager.ts`

```typescript
createJob({
  clinicId: string,           // required
  jobType: JobType,           // required
  priority?: number,          // default 5 (lower = higher priority)
  triggeredBy?: string | null,// user ID or null
  triggerSource?: 'scheduler' | 'webhook' | 'manual' | 'retry',  // default 'manual'
  totalItems?: number,
  relatedEntityType?: string,
  relatedEntityId?: string,
}): Promise<Job>
```

Jobs can be created from:

- **Manual**: User triggers from UI (e.g., "Verify Now" button).
- **Webhook**: OpenDental webhook creates `eligibility_single` jobs for appointment/patplan events.
- **Scheduler**: External cron triggers `eligibility_batch` nightly.
- **Retry**: `retryJob()` clones a failed job with `triggerSource: 'retry'` and incremented `retryCount`.

## Worker Processing

File: `server/services/queue/worker.ts`

`processNextJob()` is the main entry point:

1. `getNextJob()` dequeues from the `jobs` table: `WHERE status='queued' ORDER BY priority ASC, created_at ASC LIMIT 1`.
2. Sets status to `running`, records `startedAt`.
3. Appends a "started" entry to `execution_log`.
4. Looks up handler by `jobType` in the `jobHandlers` map.
5. If no handler exists, marks job as `failed` with an error message and returns.
6. Executes the handler.
7. On success: status -> `completed`, records `completedAt` and `durationMs`.
8. On failure: see Retry Logic below.

Returns `true` if a job was processed (success or failure), `false` if the queue was empty.

## Retry Logic

On handler failure (thrown exception):

- If `retryCount < maxRetries` (default 3):
  - Status -> `retrying`
  - `nextRetryAt` = now + exponential backoff: `1000 * 60 * 2^retryCount` ms
    - Retry 0: ~1 minute
    - Retry 1: ~2 minutes
    - Retry 2: ~4 minutes
  - `retryCount` incremented on the same job row
  - `errorMessage` recorded
- If `retryCount >= maxRetries`:
  - Status -> `failed`
  - `completedAt` and `errorMessage` recorded

Note: The `retrying` status is set on the existing job row. The job must transition back to `queued` (externally or via the retry API) to be picked up again. The `retryJob()` function in the manager creates a new job row as a copy.

## Priority System

- Integer field, default 5.
- Lower number = higher priority.
- Jobs dequeued in order: `priority ASC`, then `created_at ASC` (FIFO within same priority).

## Execution Log

Each job has an `execution_log` JSONB array. Entries are appended per step:

```typescript
interface ExecutionLogEntry {
  step: number;
  action: string;
  status: 'started' | 'completed' | 'failed' | 'skipped';
  message: string;
  timestamp: string;     // ISO datetime
  durationMs?: number;
  data?: unknown;
}
```

The worker appends at minimum two entries: a "started" entry (step 1) and a "completed" or "failed" entry (step 2). Individual handlers may append additional entries for sub-steps.

## Worker Invocation

The worker is triggered by `POST /api/internal/worker`:

- **Auth**: `Authorization: Bearer {JWT_SECRET}` (the raw secret value, not a user JWT).
- **Response**: `{ "processed": boolean }`.
- Returns `true` if a job was processed, `false` if the queue was empty.

To poll the worker on a schedule:

```bash
curl -X POST http://localhost:3000/api/internal/worker \
  -H "Authorization: Bearer $JWT_SECRET"
```

For production on Vercel, configure Vercel Cron Jobs in `vercel.json`.

## Managing Jobs via API

All endpoints require authentication. Role restrictions noted below.

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| `GET` | `/api/jobs` | it_admin, staff_admin, staff_user | List jobs with filters (`status`, `job_type`, `clinic_id`, `limit`, `offset`) |
| `GET` | `/api/jobs/:id` | it_admin, staff_admin, staff_user | Get job detail with execution log |
| `POST` | `/api/jobs/:id/cancel` | it_admin, staff_admin | Cancel a queued or running job |
| `POST` | `/api/jobs/:id/retry` | it_admin, staff_admin | Create a new job copy for retry |

Clinic scoping: non-`it_admin` users can only see jobs belonging to their own clinic.

## Key Files

| File | Purpose |
|------|---------|
| `server/services/queue/types.ts` | `JobType` union, `ExecutionLogEntry`, `CreateJobParams` |
| `server/services/queue/manager.ts` | `createJob`, `getNextJob`, `updateJobStatus`, `appendToExecutionLog`, `cancelJob`, `retryJob`, `getJobById`, `getJobsByClinic` |
| `server/services/queue/worker.ts` | `processNextJob` with `jobHandlers` map |
| `server/routes/jobs.ts` | HTTP handlers: `listJobs`, `getJob`, `cancelJob`, `retryJobHandler` |
| `app/api/internal/worker/route.ts` | Next.js route for worker invocation |
