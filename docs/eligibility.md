# Eligibility Verification Guide

DentalFlow automates insurance eligibility verification by connecting to payer adapters (currently via DentalXChange clearinghouse) and writing results back to the PMS. Verification can be triggered in four ways: batch nightly, day-of-service recheck, on-demand, or via webhook.

---

## Verification Flow

**File**: `server/services/eligibility/engine.ts`

The `verifyPatientEligibility(params)` function is the core entry point. It accepts:

```ts
interface VerifyParams {
  patientId: string;
  insuranceId: string;
  clinicId: string;
  trigger: 'batch_nightly' | 'batch_recheck' | 'on_demand' | 'webhook';
  triggeredBy?: string | null;  // userId for manual triggers
}
```

### Steps

1. **Load patient** from `patients_cache` by ID. Throws `NotFoundError` if missing.

2. **Load insurance** from `insurance_cache` by ID. Throws `NotFoundError` if missing.

3. **Load clinic** from `clinics` table for the provider NPI. Throws `NotFoundError` if missing.

4. **Classify payer** -- `classifyPayer(carrierName)` returns `{ adapterKey, payerType }`. If `payerType === 'unknown'`, the function records the result as `eligibilityResult: 'unknown'` with `pmsWriteResult: 'skipped_unknown_payer'` and returns early.

5. **Look up payer config** from `payer_configs` table (by `clinicId` + `payerName`). If not found, records as `unknown` with `pmsWriteResult: 'skipped_no_payer_config'`. If found but disabled, records with `pmsWriteResult: 'skipped_payer_disabled'`. Both return early.

6. **Get payer adapter** via `getPayerAdapter(config)` factory, which instantiates the correct adapter class based on `adapterKey`.

7. **Build request** -- constructs an `EligibilityRequest` with:
   - `subscriberId` from the insurance record
   - Patient `firstName`, `lastName`, `dateOfBirth`
   - `providerNpi` from the clinic
   - `dateOfService` set to today

8. **Execute verification** -- calls `adapter.checkEligibility(request)`. On exception: records as `status: 'failed'`, creates an error notification, and returns early.

9. **Store result** -- inserts into `eligibility_checks` table with status, dates, coverage details, and a JSONB `resultDetails` column containing:

   ```json
   {
     "annualMaximum": 1500,
     "annualMaximumUsed": 450,
     "deductible": 50,
     "deductibleMet": 50,
     "coveragePercentages": {
       "preventive": 100,
       "basic": 80,
       "major": 50,
       "ortho": 0
     },
     "copays": [{ "category": "preventive", "amount": 0 }],
     "waitingPeriods": [{ "category": "major", "endDate": "2026-06-01" }]
   }
   ```

10. **Update insurance cache** -- sets `lastVerifiedAt`, `verificationStatus`, and `updatedAt` on the insurance record.

11. **PMS write-back** -- gated by `hasRealPMSCredentials()`, which checks that the clinic's `pmsConfig` contains `developer_key` and `customer_key` values that are not empty or `'placeholder'`. If credentials exist and the insurance record has a `pmsPatplanId`:
    - Calls `pmsAdapter.writeVerificationResult()` to update OpenDental's InsVerify record
    - Records `writtenToPms: true/false` and `pmsWriteResult: 'success' | 'failed' | 'error: <message>'`
    - If no real credentials: records `pmsWriteResult: 'skipped_no_credentials'`

12. **Create notification** -- if the result status is `inactive` or `unknown`, creates a notification for clinic staff.

---

## Payer Classification

**File**: `server/services/eligibility/classifier.ts`

`classifyPayer(carrierName)` performs case-insensitive substring matching against known carrier maps.

### Commercial Carriers (via `clearinghouse.dentalxchange`)

| Carrier |
|---------|
| Delta Dental |
| MetLife |
| Cigna |
| Aetna |
| United Healthcare |
| Guardian |
| Humana |
| Principal |
| Ameritas |
| SunLife |

### Medicaid Carriers (via `medicaid.minnesota`)

| Carrier |
|---------|
| Minnesota Medicaid |
| Medical Assistance |
| DentaQuest |
| Health Partners Medicaid |

Unrecognized carriers return `{ adapterKey: 'manual_review', payerType: 'unknown' }`.

`isKnownPayer(carrierName)` is a convenience wrapper that returns `true` if the carrier resolves to any type other than `unknown`.

---

## Payer Adapter Registry

**File**: `server/adapters/payer/registry.ts`

`getPayerAdapter(config)` is a factory that maps `adapterKey` to adapter instances:

| Adapter Key | Class | Status |
|-------------|-------|--------|
| `clearinghouse.dentalxchange` | `DentalXChangeAdapter` | Implemented |
| `medicaid.minnesota` | `MinnesotaMedicaidAdapter` | Planned |

All adapters implement the `IPayerAdapter` interface:

```ts
interface IPayerAdapter {
  readonly payerName: string;
  readonly payerType: 'medicaid' | 'commercial';
  readonly supportedStates?: string[];
  testConnection(): Promise<{ connected: boolean; error?: string }>;
  checkEligibility(request: EligibilityRequest): Promise<EligibilityResult>;
  getHealthStatus(): Promise<{ status: 'healthy' | 'degraded' | 'down'; lastCheck: string }>;
}
```

Unsupported adapter keys throw `PayerNotSupportedError`.

---

## Batch Verification

**File**: `server/services/eligibility/batch.ts`

`runBatchVerification(clinicId, triggeredBy?)` orchestrates nightly bulk checks.

### Process

1. Reads the `verification_threshold_days` setting from the `settings` table (default: 30).
2. Queries `insurance_cache` joined with `patients_cache` for active patients whose insurance has never been verified or was last verified before the threshold date.
3. Creates a tracking job record (`eligibility_batch` type).
4. Iterates through stale records, calling `verifyPatientEligibility()` for each with `trigger: 'batch_nightly'`.
5. Appends execution log entries to the job for each step (started, completed, or failed).
6. Updates the job's `processedItems` and `failedItems` counts after each iteration.
7. Marks the job as completed and creates a batch summary notification.

### Return Value

```ts
interface BatchResult {
  total: number;
  active: number;
  inactive: number;
  failed: number;
  skipped: number;
}
```

Typically triggered nightly via a scheduled `eligibility_batch` job.

---

## Day-of-Service Recheck

**File**: `server/services/eligibility/recheck.ts`

`runDayOfServiceRecheck(clinicId)` re-verifies patients whose insurance was previously verified as active. This catches coverage lapses that occurred since the last batch run.

### Process

1. Queries insurance records where `verificationStatus === 'active'` and `lastVerifiedAt` is not null, joined with active patients.
2. Creates a tracking job (`eligibility_recheck` type).
3. For each record, calls `verifyPatientEligibility()` with `trigger: 'batch_recheck'`.
4. If the result status changed from the previous status:
   - Increments the `changed` counter.
   - If the new status is `inactive`, creates an urgent notification with `severity: 'error'` flagging the day-of-service change.
5. If the status is unchanged, increments the `unchanged` counter.

### Return Value

```ts
interface RecheckResult {
  total: number;
  changed: number;
  unchanged: number;
  failed: number;
}
```

---

## Webhook-Triggered Verification

**File**: `server/routes/webhooks.ts`

When OpenDental sends a webhook, verification can be triggered automatically.

### Eligible Events

- `appointment.created`
- `appointment.updated`
- `patplan.created`
- `patplan.updated`

### Flow

1. `POST /api/webhooks/opendental` receives the payload.
2. Webhook secret is verified against the `WEBHOOK_SECRET` environment variable (checked in the `x-webhook-secret` header or `secret` query parameter). If no secret is configured, all requests are accepted with a console warning.
3. Payload structure is validated -- must contain `EventType` (string), `TableName` (string), and `KeyNum`.
4. If the event type matches an eligibility event and includes a `ClinicId`, a `webhook_process` job is created.
5. Returns `200` immediately (OpenDental retries for up to 3 days on non-200 responses).
6. The queue worker processes the `webhook_process` job and creates an `eligibility_single` job, which calls `verifyPatientEligibility()` with `trigger: 'webhook'`.

---

## Notifications

**File**: `server/services/notifications/service.ts`

The eligibility engine automatically creates notifications at several points.

### Notification Types

| Condition | Type | Severity | Target Roles |
|-----------|------|----------|-------------|
| Adapter threw an exception | `eligibility_failed` | `error` | `staff_admin`, `staff_user` |
| Insurance is inactive | `eligibility_inactive` | `warning` | `staff_admin`, `staff_user` |
| Payer returned unknown status | `eligibility_failed` | `warning` | `staff_admin`, `staff_user` |
| Day-of-service status changed to inactive | `eligibility_inactive` | `error` | `staff_admin`, `staff_user` |
| Batch run completed | `eligibility_batch_summary` | `warning` or `info` | `it_admin`, `staff_admin` |

Batch summary severity is `warning` when any inactive or failed results are present, `info` otherwise.

All eligibility notifications include an `actionUrl` linking to `/eligibility?patient_id=<id>` for quick navigation.

---

## PMS Write-Back Results

The `pmsWriteResult` field on `eligibility_checks` records the outcome of the write-back attempt:

| Value | Meaning |
|-------|---------|
| `success` | Written to OpenDental InsVerify successfully |
| `failed` | PMS write attempted but failed |
| `error: <message>` | PMS write threw an exception |
| `skipped_no_credentials` | Clinic lacks real PMS credentials |
| `skipped_unknown_payer` | Carrier not recognized, skipped entirely |
| `skipped_no_payer_config` | No `payer_configs` entry for this clinic + carrier |
| `skipped_payer_disabled` | Payer config exists but `isEnabled` is false |
| `skipped_verification_failed` | The eligibility check itself failed before write-back |

---

## Key Files

| File | Purpose |
|------|---------|
| `server/services/eligibility/engine.ts` | Core verification logic (12 steps) |
| `server/services/eligibility/batch.ts` | Nightly batch orchestrator |
| `server/services/eligibility/recheck.ts` | Day-of-service recheck |
| `server/services/eligibility/classifier.ts` | Payer routing and classification |
| `server/adapters/payer/types.ts` | `EligibilityRequest`, `EligibilityResult`, `IPayerAdapter` types |
| `server/adapters/payer/registry.ts` | Payer adapter factory |
| `server/routes/webhooks.ts` | Webhook ingestion and job creation |
| `server/services/notifications/service.ts` | Auto-notification creation |
