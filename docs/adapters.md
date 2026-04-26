# Adapter Development Guide

DentalFlow uses an adapter pattern to integrate with Practice Management Systems (PMS) and insurance payers. Each adapter translates vendor-specific APIs into canonical data models, allowing the rest of the platform to work without knowing which PMS or payer is behind the scenes.

Current adapters:
- **PMS**: OpenDental
- **Payer**: DentalXChange (commercial clearinghouse)

---

## PMS Adapter System

### Architecture Overview

```
DentalFlow Core
  |
  v
IPMSAdapter interface  <-- canonical types in / canonical types out
  |
  +-- OpenDentalAdapter   (server/adapters/pms/opendental/)
  +-- [YourAdapter]        (server/adapters/pms/yourpms/)
  |
Registry (server/adapters/pms/registry.ts)
  ^
  |
clinic.pmsType + clinic.pmsConfig (encrypted JSONB)
```

`getAdapter(clinic)` in the registry reads `clinic.pmsType`, decrypts credentials from `clinic.pmsConfig`, and returns the matching adapter instance. If the type is unknown, it throws `PMSNotSupportedError`.

### IPMSAdapter Interface

Defined in `server/adapters/pms/types.ts`. Every PMS adapter must implement:

| Method | Purpose |
|--------|---------|
| `testConnection()` | Verify API connectivity. Returns `{ connected, version?, error? }`. |
| `getPatients(params)` | Fetch patients, optionally filtered by `modifiedSince`. Returns `SyncResult<CanonicalPatient>`. |
| `getPatientById(pmsPatientId)` | Fetch a single patient by PMS ID. Returns `null` if not found. |
| `getAppointments(params)` | Fetch appointments in a date range. Returns `SyncResult<CanonicalAppointment>`. |
| `getInsurancePlans(patientPmsId)` | Fetch all insurance plans for a patient. Returns `CanonicalInsurancePlan[]`. |
| `getVerificationStatus(patPlanPmsId)` | Get the last verification status for a patient plan. Returns `null` if never verified. |
| `writeVerificationResult(params)` | Write a verification result back to the PMS. Returns `WriteResult`. |
| `getClaims(params)` | Fetch claims with optional filters. Returns `SyncResult<CanonicalClaim>`. |
| `postInsurancePayment(params)` | Post an insurance payment with line items. Returns `WriteResult`. |
| `parseWebhookPayload(rawPayload)` | Normalize a raw webhook payload into `{ eventType, entityType, entityId, timestamp, data }`. |

### Canonical Data Models

All adapters map vendor data into these shapes. Defined in `server/adapters/pms/types.ts`.

**CanonicalPatient**

| Field | Type | Required |
|-------|------|----------|
| `pmsId` | `string` | yes |
| `firstName` | `string` | yes |
| `lastName` | `string` | yes |
| `dateOfBirth` | `string` | yes |
| `gender` | `'M' \| 'F' \| 'Other' \| 'Unknown'` | yes |
| `phoneHome` | `string` | no |
| `phoneCell` | `string` | no |
| `email` | `string` | no |
| `address`, `city`, `state`, `zip` | `string` | no |
| `guarantorPmsId` | `string` | no |
| `preferredContact` | `string` | no |
| `balance` | `number` | no |
| `status` | `'active' \| 'inactive' \| 'archived'` | yes |

**CanonicalAppointment**

| Field | Type | Required |
|-------|------|----------|
| `pmsId` | `string` | yes |
| `patientPmsId` | `string` | yes |
| `dateTime` | `string` | yes |
| `duration` | `number` (minutes) | yes |
| `status` | `'scheduled' \| 'confirmed' \| 'checked_in' \| 'in_progress' \| 'completed' \| 'broken' \| 'cancelled'` | yes |
| `provider` | `string` | yes |
| `operatory` | `string` | no |
| `procedures` | `string[]` | no |
| `notes` | `string` | no |

**CanonicalInsurancePlan**

| Field | Type | Required |
|-------|------|----------|
| `patientPmsId` | `string` | yes |
| `ordinal` | `number` | yes |
| `patPlanPmsId` | `string` | yes |
| `insSubPmsId` | `string` | yes |
| `insPlanPmsId` | `string` | yes |
| `carrierPmsId` | `string` | yes |
| `carrierName` | `string` | yes |
| `carrierPhone` | `string` | no |
| `carrierElectId` | `string` | no |
| `groupName`, `groupNumber` | `string` | no |
| `subscriberId` | `string` | yes |
| `subscriberName` | `string` | no |
| `planType`, `filingCode` | `string` | no |

**CanonicalVerificationStatus**

| Field | Type | Required |
|-------|------|----------|
| `patPlanPmsId` | `string` | yes |
| `verifyType` | `'patient_enrollment' \| 'insurance_benefit'` | yes |
| `lastVerifiedDate` | `string` | no |
| `verifyNote` | `string` | no |

**CanonicalClaim**

| Field | Type | Required |
|-------|------|----------|
| `pmsId` | `string` | yes |
| `patientPmsId` | `string` | yes |
| `carrierName` | `string` | yes |
| `claimType` | `string` | yes |
| `status` | `string` | yes |
| `amountBilled` | `number` | yes |
| `amountPaid` | `number` | yes |
| `dateSubmitted` | `string` | no |
| `dateReceived` | `string` | no |
| `procedures` | `{ code, toothNum?, fee, allowed?, paid?, status }[]` | yes |

**SyncResult\<T\>** -- Wraps paginated reads: `{ items: T[], totalCount: number, hasMore: boolean, syncTimestamp: string }`.

**WriteResult** -- Wraps write operations: `{ success: boolean, pmsRecordId?: string, error?: string }`.

### OpenDental Reference Implementation

Files in `server/adapters/pms/opendental/`:

| File | Purpose |
|------|---------|
| `types.ts` | TypeScript interfaces for OpenDental API responses (`ODPatient`, `ODAppointment`, `ODPatPlan`, `ODInsSub`, `ODInsPlan`, `ODCarrier`, `ODInsVerify`, `ODClaim`). |
| `client.ts` | HTTP client. Auth header: `ODFHIR {devKey}/{customerKey}`. 30s timeout, 3 retries with exponential backoff on 5xx. Rate limiting: 5s between reads, 1s between writes (remote mode). Paginated `getAll()` method. |
| `mappers.ts` | Pure functions mapping OD types to canonical models: `mapPatient()`, `mapAppointment()`, `mapInsurancePlan()`, `mapVerificationStatus()`, `mapClaim()`. |
| `adapter.ts` | `OpenDentalAdapter implements IPMSAdapter`. Wires client calls to interface methods. `getInsurancePlans()` chains 4 sub-queries per plan (patplans -> inssubs -> insplans -> carriers). |
| `webhooks.ts` | Parses OD webhook payloads (`{ EventType, TableName, KeyNum, DateTimeEntry }`) into `{ eventType, entityType, entityId, timestamp, data }`. Normalizes table names and event types via lookup maps. |

**OpenDentalConfig** stored in `clinic.pmsConfig` JSONB:

```json
{
  "base_url": "https://api.opendental.com/api/v1",
  "developer_key": "<encrypted>",
  "customer_key": "<encrypted>",
  "api_mode": "remote"
}
```

`api_mode` affects rate limiting and page sizes:
- `remote` -- OpenDental cloud API. 5s read throttle, 1s write throttle, 100 items per page.
- `local` / `service` -- Self-hosted. No throttling, 1000 items per page.

### Development Mock Mode

`OpenDentalAdapter` ships with a built-in mock mode that short-circuits the write path so dev environments can exercise the EOB auto-post flow without real OpenDental credentials. Mock mode is **enabled automatically** when any of the following is true:

- `process.env.PMS_MOCK_MODE === 'true'`
- `clinic.pmsConfig.developer_key === 'placeholder'`
- `clinic.pmsConfig.customer_key === 'placeholder'`

The seed clinic (`server/db/seed.ts`) ships with both keys set to `'placeholder'`, so a freshly seeded local DB falls into mock mode out of the box.

**What it does:** `postInsurancePayment()` returns `{ success: true, pmsRecordId: 'MOCK-<timestamp>' }` and logs a `[PMS-MOCK]` line instead of calling `https://api.opendental.com/api/v1/claimpayments`. The EOB engine treats this as a successful post and updates `eob_records.posted_to_pms`, `posted_at`, and `pms_claim_payment_id` normally.

**What it does *not* do:** read methods (`getPatients`, `getClaims`, etc.) still hit the real API. Mock mode only intercepts the insurance payment write — the only write that affects EOB auto-post verification today. If you add new write methods to the adapter, decide explicitly whether they should respect `isMockMode` and add the same guard pattern at the top of the method.

**Production:** real `developer_key` / `customer_key` values (and `PMS_MOCK_MODE` unset / `false`) deactivate mock mode. The placeholder check is a safe fallback — production-grade encrypted credentials never decrypt to the literal string `'placeholder'`.

### Adding a New PMS Adapter

Use OpenDental as a reference. The steps:

**1. Create the directory structure**

```
server/adapters/pms/yourpms/
  types.ts      -- vendor API response interfaces
  client.ts     -- HTTP client with auth, retry, rate limiting
  mappers.ts    -- pure functions: vendor types -> canonical types
  adapter.ts    -- implements IPMSAdapter
  webhooks.ts   -- (optional) webhook payload parser
```

**2. Define vendor types** (`types.ts`)

Create TypeScript interfaces for every API response shape you will consume. Keep these 1:1 with the vendor API docs -- do not reshape here.

```typescript
// Example for a hypothetical Dentrix adapter
export interface DentrixPatient {
  id: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  // ... vendor-specific fields
}

export interface DentrixConfig {
  baseUrl: string;
  apiKey: string;
  practiceId: string;
}
```

**3. Build the HTTP client** (`client.ts`)

Handle vendor-specific auth, rate limiting, retries, and pagination. Key considerations:

- Set a timeout (30s is a reasonable default).
- Retry on 5xx with exponential backoff. Do not retry on 4xx.
- Respect the vendor's rate limits. Check their docs for published limits and add throttling.
- Implement a paginated fetch method if the API supports pagination.

**4. Write mappers** (`mappers.ts`)

One pure function per canonical type. Map vendor enums, status codes, and field names to canonical values. Handle missing/optional fields gracefully -- use `undefined`, not empty strings.

```typescript
import type { DentrixPatient } from './types';
import type { CanonicalPatient } from '../types';

export function mapPatient(d: DentrixPatient): CanonicalPatient {
  return {
    pmsId: d.id,
    firstName: d.first_name,
    lastName: d.last_name,
    dateOfBirth: d.birth_date,
    gender: mapGender(d.gender),
    status: mapStatus(d.status),
    // ... map remaining fields
  };
}
```

**5. Implement the adapter** (`adapter.ts`)

```typescript
import type { IPMSAdapter, SyncResult, CanonicalPatient } from '../types';
import { DentrixClient } from './client';
import { mapPatient } from './mappers';
import type { DentrixConfig } from './types';

export class DentrixAdapter implements IPMSAdapter {
  readonly pmsType = 'dentrix';
  private client: DentrixClient;

  constructor(config: DentrixConfig) {
    this.client = new DentrixClient(config);
  }

  async testConnection() {
    try {
      await this.client.get('/health');
      return { connected: true };
    } catch (err) {
      return { connected: false, error: err instanceof Error ? err.message : 'Failed' };
    }
  }

  async getPatients(params: { modifiedSince?: string; limit?: number; offset?: number }) {
    // Fetch, map, return SyncResult
  }

  // ... implement all IPMSAdapter methods
}
```

**6. Register in the PMS registry** (`server/adapters/pms/registry.ts`)

Add a case to the `getAdapter` switch:

```typescript
case 'dentrix': {
  const config = decryptDentrixConfig(clinic.pmsConfig as Record<string, unknown>);
  return new DentrixAdapter(config);
}
```

Write a `decryptDentrixConfig()` function following the pattern of `decryptOpenDentalConfig()`. Use the `decrypt()` utility from `server/services/encryption/credentials` for any secret fields.

**7. Document the pmsConfig schema**

The `pmsConfig` JSONB column stores encrypted credentials per clinic. Document the expected shape for your PMS type so ops teams know what to provision.

---

## Payer Adapter System

### Architecture Overview

```
Eligibility Service
  |
  v
classifyPayer(carrierName)  -->  adapterKey  (e.g., "clearinghouse.dentalxchange")
  |
  v
getPayerAdapter({ adapterKey, payerName })  -->  IPayerAdapter instance
  |
  +-- DentalXChangeAdapter   (server/adapters/payer/clearinghouse/dentalxchange.ts)
  +-- [YourAdapter]           (server/adapters/payer/medicaid/yourstate.ts)
  |
Registry (server/adapters/payer/registry.ts)
```

The flow:
1. The eligibility service calls `classifyPayer(carrierName)` to get an `adapterKey` and `payerType`.
2. The adapter key is passed to `getPayerAdapter()` in the registry, which returns the correct adapter.
3. The adapter's `checkEligibility()` method runs the 270/271 transaction (or equivalent).

### IPayerAdapter Interface

Defined in `server/adapters/payer/types.ts`.

| Method | Purpose |
|--------|---------|
| `testConnection()` | Verify connectivity. Returns `{ connected, error? }`. |
| `checkEligibility(request)` | Run an eligibility check. Returns `EligibilityResult`. |
| `getHealthStatus()` | Returns `{ status: 'healthy' \| 'degraded' \| 'down', lastCheck }`. |
| `retrieveEOBs?(params)` | *Optional.* Retrieve EOB documents for a date range. Returns `RawEOBDocument[]`. |

Properties:

| Property | Type | Purpose |
|----------|------|---------|
| `payerName` | `string` | Human-readable payer name. |
| `payerType` | `'medicaid' \| 'commercial'` | Determines processing rules. |
| `supportedStates` | `string[]` (optional) | For Medicaid adapters: which states this adapter covers. |

### EOB Retrieval Types

The optional `retrieveEOBs(params)` method takes `{ dateFrom: string; dateTo: string; clinicNpi: string }` (all ISO dates / NPI string) and returns `RawEOBDocument[]`.

**RawEOBDocument**

| Field | Type | Required |
|-------|------|----------|
| `checkNumber` | `string` | yes |
| `checkDate` | `string` (ISO date) | yes |
| `checkAmount` | `number` | yes |
| `payerName` | `string` | yes |
| `receivedDate` | `string` (ISO date) | no |
| `source` | `EOBSource` | yes |
| `lineItems` | `RawEOBLineItem[]` | yes |
| `rawData` | `unknown` | no |

**RawEOBLineItem**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `patientFirstName` | `string` | yes | Used for fuzzy patient matching |
| `patientLastName` | `string` | yes | Used for fuzzy patient matching |
| `patientDob` | `string` (ISO date) | no | Used to disambiguate fuzzy matches |
| `patientPmsId` | `string` | no | If supplied, parser tries exact match first |
| `procedureCode` | `string` | yes | CDT code |
| `toothNumber` | `string` | no | |
| `serviceDate` | `string` (ISO date) | yes | |
| `fee` | `number` | yes | Billed amount |
| `allowed` | `number` | yes | Carrier-allowed amount |
| `paid` | `number` | yes | Insurance-paid amount |
| `adjustment` | `number` | yes | Write-off (`fee - allowed`) |
| `patientResponsibility` | `number` | yes | |
| `denialCode` | `string` | no | e.g., `CO-4` |
| `denialReason` | `string` | no | |
| `claimPmsId` | `string` | no | If supplied, used to tighten claim match in triage |

**EOBSource** -- `'edi_835' | 'portal_scrape' | 'manual_upload'`

Adapters that do not implement `retrieveEOBs` are skipped during EOB sync jobs. The EOB engine only calls adapters whose payer config has `featuresEnabled.eob` set to `true` (see `server/services/eob/engine.ts`).

### Request and Result Types

**EligibilityRequest**

| Field | Type | Required |
|-------|------|----------|
| `subscriberId` | `string` | yes |
| `firstName` | `string` | yes |
| `lastName` | `string` | yes |
| `dateOfBirth` | `string` (ISO date) | yes |
| `providerNpi` | `string` | yes |
| `dateOfService` | `string` (ISO date) | yes |
| `alternateIds` | `string[]` | no |

**EligibilityResult**

| Field | Type | Required |
|-------|------|----------|
| `status` | `'active' \| 'inactive' \| 'pending' \| 'unknown'` | yes |
| `effectiveDate` | `string` (ISO date) | no |
| `terminationDate` | `string` (ISO date) | no |
| `managedCarePlan` | `string` | no |
| `dentalCoverageIncluded` | `boolean` | yes |
| `annualMaximum` | `number` | no |
| `annualMaximumUsed` | `number` | no |
| `deductible` | `number` | no |
| `deductibleMet` | `number` | no |
| `coveragePercentages` | `{ preventive?, basic?, major?, ortho? }` | no |
| `copays` | `{ category, amount }[]` | no |
| `waitingPeriods` | `{ category, endDate }[]` | no |
| `checkedAt` | `string` (ISO datetime) | yes |
| `rawResponse` | `string` | no |
| `errorMessage` | `string` | no |

### Payer Classification

`classifyPayer(carrierName)` in `server/services/eligibility/classifier.ts` maps carrier names (case-insensitive substring match) to adapter keys.

Current mappings:

| Carrier Names | Adapter Key | Type |
|---------------|-------------|------|
| Delta Dental, MetLife, Cigna, Aetna, United Healthcare, Guardian, Humana, Principal, Ameritas, SunLife | `clearinghouse.dentalxchange` | commercial |
| Minnesota Medicaid, Medical Assistance, DentaQuest, Health Partners Medicaid | `medicaid.minnesota` | medicaid |
| Everything else | `manual_review` | unknown |

### DentalXChange EOB Support

The DentalXChange adapter (`server/adapters/payer/clearinghouse/dentalxchange.ts`) implements the optional `retrieveEOBs` method. The current implementation is a deterministic mock 835 generator suitable for the demo prototype — it produces 1–4 EOB documents per call with 1–3 line items each, ~10% denial rate, and amounts that span both auto-post-eligible (`paid <= $250`) and flagged ranges. Production deployment requires replacing the body of `retrieveEOBs` with real DentalXChange API calls and 835 EDI parsing; the surrounding parser, triage, and posting pipeline are production-ready.

### Adding a New Payer Adapter

**1. Create the adapter file**

For a clearinghouse adapter:
```
server/adapters/payer/clearinghouse/youradapter.ts
```

For a state Medicaid adapter:
```
server/adapters/payer/medicaid/yourstate.ts
```

**2. Implement IPayerAdapter**

```typescript
import type { IPayerAdapter, EligibilityRequest, EligibilityResult } from '../types';

export class MinnesotaMedicaidAdapter implements IPayerAdapter {
  readonly payerName: string;
  readonly payerType = 'medicaid' as const;
  readonly supportedStates = ['MN'];

  constructor(payerName: string) {
    this.payerName = payerName;
  }

  async testConnection() {
    // Hit the state portal's health endpoint
  }

  async getHealthStatus() {
    // Return current status
  }

  async checkEligibility(request: EligibilityRequest): Promise<EligibilityResult> {
    // Call the state Medicaid portal
    // Map response to EligibilityResult
    // Always set checkedAt and dentalCoverageIncluded
  }
}
```

**3. Register in the payer registry** (`server/adapters/payer/registry.ts`)

```typescript
case 'medicaid.minnesota':
  return new MinnesotaMedicaidAdapter(config.payerName);
```

**4. Add carrier name mappings** (`server/services/eligibility/classifier.ts`)

Add entries to `MEDICAID_CARRIERS` or `COMMERCIAL_CARRIERS`:

```typescript
const MEDICAID_CARRIERS: Record<string, string> = {
  // ... existing entries
  'your new carrier name': 'medicaid.yourstate',
};
```

The classifier does case-insensitive substring matching in both directions (`normalized.includes(key) || key.includes(normalized)`), so add the most specific carrier name variations.

**5. Add payer_configs records**

Each clinic needs a `payer_configs` database record for the new payer so the registry can look up credentials.

---

## Error Handling

Four error classes in `server/adapters/pms/types.ts` and `server/adapters/payer/types.ts`:

| Error | Thrown When |
|-------|------------|
| `PMSNotSupportedError` | `clinic.pmsType` has no registered adapter in the PMS registry. |
| `PMSConnectionError` | PMS API is unreachable, returns 5xx after retries, or times out. |
| `PayerNotSupportedError` | `adapterKey` has no registered adapter in the payer registry. |
| `PayerConnectionError` | Payer API is unreachable or returns an unrecoverable error. |

Adapter methods that perform writes (`writeVerificationResult`, `postInsurancePayment`) catch errors internally and return `WriteResult` with `success: false` and an `error` message. Read methods may throw `PMSConnectionError` on network failures.

---

## Testing Adapters

Guidelines for testing new adapters:

1. **Unit test mappers** -- mappers are pure functions. Test each one with representative vendor API responses, edge cases (missing optional fields, unexpected enum values), and verify the canonical output.
2. **Mock the HTTP client** -- adapter tests should mock the client layer to avoid hitting real APIs.
3. **Integration test with `testConnection()`** -- use a sandbox/test environment from the vendor. The `testConnection()` method is designed for this.
4. **Test rate limiting** -- verify your client respects vendor rate limits under load.
5. **Test retry behavior** -- simulate 5xx responses and verify exponential backoff works correctly.
