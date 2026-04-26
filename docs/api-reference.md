# DentalFlow API Reference

## Overview

**Base URL**: `http://localhost:3000/api` (development) | `{APP_URL}/api` (production)

**Content-Type**: All request and response bodies are `application/json`.

---

## Authentication

All endpoints require a Bearer token in the `Authorization` header unless marked **Public** or **Secret-based**.

```
Authorization: Bearer {accessToken}
```

Tokens are JWTs issued by `POST /api/auth/login`. Access tokens expire per `JWT_EXPIRY` (default 15m). Refresh tokens expire per `REFRESH_TOKEN_EXPIRY_DAYS` (default 7 days) and support rotation.

### Roles

| Role | Description |
|------|-------------|
| `it_admin` | Full platform access. Sees all clinics, manages users, clinics, and system settings. |
| `staff_admin` | Clinic-scoped admin. Manages users and settings within their assigned clinic. |
| `staff_user` | Clinic-scoped read-heavy role. Views patients, jobs, notifications within their clinic. |

### Clinic Scoping

Non-`it_admin` users are automatically scoped to their assigned `clinicId`. The `clinic_id` query parameter is only effective for `it_admin` users; for other roles it is ignored and replaced by the user's own clinic.

---

## Pagination

List endpoints that support pagination return:

```json
{
  "data": [],
  "total": 142,
  "limit": 50,
  "offset": 0
}
```

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `limit` | 50 | 100 | Number of records per page. |
| `offset` | 0 | -- | Number of records to skip. |

---

## Common Query Parameters

These parameters are accepted by most list endpoints via `parseQueryParams`:

| Parameter | Type | Description |
|-----------|------|-------------|
| `clinic_id` | uuid | Filter by clinic (effective for `it_admin` only). |
| `search` | string | Free-text search (patients: first name, last name, email). |
| `status` | string | Filter by status field. |
| `limit` | int | Page size (default 50, max 100). |
| `offset` | int | Pagination offset. |
| `date_from` | ISO date | Start of date range filter. |
| `date_to` | ISO date | End of date range filter. |

---

## Error Responses

All errors follow this shape:

```json
{
  "error": "Human-readable message",
  "code": "ERROR_CODE",
  "fieldErrors": {
    "email": ["Invalid email address"]
  }
}
```

The `fieldErrors` key is only present on `VALIDATION_ERROR` responses. PHI (SSN, phone, email, DOB, insurance IDs) is automatically redacted from error messages logged server-side.

### Error Codes

| HTTP | Code | Description |
|------|------|-------------|
| 400 | `VALIDATION_ERROR` | Request body or parameters failed Zod validation. |
| 401 | `AUTHENTICATION_ERROR` | Missing, invalid, or expired token. |
| 403 | `AUTHORIZATION_ERROR` | Authenticated but insufficient role permissions. |
| 404 | `NOT_FOUND` | Resource does not exist or is outside the caller's clinic scope. |
| 409 | `CONFLICT` | Duplicate resource. |
| 500 | `INTERNAL_ERROR` | Unhandled server error (details redacted). |

---

## Endpoints

### Auth

#### POST /api/auth/login

Create an authenticated session. **Public -- no token required.**

**Request Body** (validated by `loginSchema`):

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | yes | Valid email format. |
| `password` | string | yes | Min 1 character. |

**Response** `200`:

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "a1b2c3...",
  "user": {
    "id": "uuid",
    "email": "user@clinic.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "staff_admin",
    "clinicId": "uuid | null"
  }
}
```

**Errors**: `401 AUTHENTICATION_ERROR` if email/password mismatch or account inactive.

---

#### POST /api/auth/refresh

Rotate a refresh token for a new token pair. **Public -- no token required.**

**Request Body** (validated by `refreshSchema`):

| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | yes |

**Response** `200`:

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "new-refresh-token"
}
```

**Errors**: `401 AUTHENTICATION_ERROR` if token is invalid or expired.

---

#### POST /api/auth/logout

Revoke a refresh token. **Public -- no token required.**

**Request Body** (validated by `refreshSchema`):

| Field | Type | Required |
|-------|------|----------|
| `refreshToken` | string | yes |

**Response** `200`:

```json
{
  "success": true
}
```

---

#### GET /api/auth/me

Get the current authenticated user's profile. **Roles**: all.

**Response** `200`:

```json
{
  "user": {
    "id": "uuid",
    "email": "user@clinic.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "staff_admin",
    "clinicId": "uuid | null",
    "clinic": {
      "id": "uuid",
      "name": "Downtown Dental",
      "address": "123 Main St",
      "city": "Portland",
      "state": "OR",
      "zip": "97201",
      "phone": "503-555-0100",
      "npi": "1234567890",
      "status": "active"
    }
  }
}
```

The `clinic` field is `null` if the user has no assigned clinic.

---

### Patients

#### GET /api/patients

List patients with optional search and filtering. **Roles**: all.

**Query Parameters**: `clinic_id`, `search`, `status`, `limit`, `offset`

Search matches against `firstName`, `lastName`, and `email` (case-insensitive).

**Response** `200`:

```json
{
  "data": [
    {
      "id": "uuid",
      "clinicId": "uuid",
      "firstName": "John",
      "lastName": "Smith",
      "...": "remaining patient fields",
      "primaryInsurance": { "...insurance record or null" }
    }
  ],
  "total": 87,
  "limit": 50,
  "offset": 0
}
```

Each patient includes a `primaryInsurance` field (ordinal = 1) joined from the insurance cache, or `null` if none exists.

---

#### GET /api/patients/:id

Get a single patient with full insurance and recent claims. **Roles**: all.

Non-`it_admin` users can only access patients within their own clinic.

**Response** `200`:

```json
{
  "data": {
    "id": "uuid",
    "...": "patient fields",
    "insurance": [ { "...insurance records" } ],
    "recentClaims": [ { "...claim records (max 10)" } ]
  }
}
```

**Errors**: `404 NOT_FOUND` if patient does not exist or is outside the caller's clinic scope.

---

### Appointments

#### GET /api/appointments

List appointments queried live from the PMS adapter. **Roles**: all.

**Query Parameters**: `clinic_id` (required), `date_from`, `date_to`

| Parameter | Default | Description |
|-----------|---------|-------------|
| `clinic_id` | -- | Required. The clinic whose PMS to query. |
| `date_from` | today | Start date (ISO format). |
| `date_to` | today | End date (ISO format). |

**Response** `200`:

```json
{
  "data": [ { "...appointment objects from PMS" } ],
  "total": 12
}
```

If the PMS is unreachable, returns an empty array with an `error` message instead of failing:

```json
{
  "data": [],
  "total": 0,
  "error": "Unable to reach PMS. Appointments are queried live."
}
```

**Errors**: `400` if `clinic_id` is missing. `404` if clinic not found.

---

### Eligibility

#### GET /api/eligibility

List eligibility check history. **Roles**: all.

**Query Parameters**: `clinic_id`, `patient_id`, `status`, `payer`, `date_from`, `date_to`, `limit`, `offset`

The `status` parameter filters on `eligibilityResult`. The `payer` parameter filters on `payerName`.

**Response** `200`:

```json
{
  "data": [
    {
      "id": "uuid",
      "clinicId": "uuid",
      "patientId": "uuid",
      "insuranceId": "uuid",
      "payerName": "Delta Dental",
      "payerType": "commercial",
      "adapterUsed": "clearinghouse.dentalxchange",
      "trigger": "on_demand",
      "triggeredBy": "uuid",
      "status": "completed",
      "eligibilityResult": "active",
      "effectiveDate": "2025-01-01",
      "terminationDate": null,
      "managedCarePlan": null,
      "dentalCoverage": true,
      "resultDetails": { "...raw result" },
      "errorMessage": null,
      "writtenToPms": true,
      "pmsWriteResult": "success",
      "durationMs": 1234,
      "startedAt": "2025-04-23T10:00:00Z",
      "completedAt": "2025-04-23T10:00:01Z",
      "createdAt": "2025-04-23T10:00:00Z",
      "patientFirstName": "John",
      "patientLastName": "Smith"
    }
  ],
  "total": 340,
  "limit": 50,
  "offset": 0
}
```

---

#### POST /api/eligibility/verify

Run an on-demand eligibility verification for a patient. **Roles**: all.

**Request Body** (validated by `verifyEligibilitySchema`):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `patientId` | uuid | yes | |
| `insuranceId` | uuid | yes | |
| `clinicId` | uuid | no | Only effective for `it_admin`. Others use their assigned clinic. |

**Response** `200`:

```json
{
  "data": { "...eligibility check record" }
}
```

**Errors**: `400` if no `clinicId` can be resolved (user has no assigned clinic and did not provide one).

---

#### GET /api/eligibility/stats

Aggregated eligibility statistics for the last 30 days. **Roles**: `it_admin`, `staff_admin`.

**Query Parameters**: `clinic_id`

**Response** `200`:

```json
{
  "data": {
    "totalChecks": 1200,
    "byStatus": {
      "eligible": 980,
      "ineligible": 150,
      "error": 70
    },
    "byPayer": {
      "Delta Dental": 500,
      "MetLife": 400,
      "Cigna": 300
    },
    "avgDurationMs": 1456,
    "lastBatchRun": "2025-04-22T02:00:00Z"
  }
}
```

`lastBatchRun` is `null` if no batch (`batch_nightly` trigger) has ever run for the scoped clinic.

---

### Clinics

#### GET /api/clinics

List clinics visible to the caller. **Roles**: all.

- `it_admin`: returns all clinics.
- `staff_admin` / `staff_user`: returns only the caller's assigned clinic.
- Users with no assigned clinic receive an empty array.

**Response** `200`:

```json
{
  "data": [ { "...clinic objects" } ]
}
```

---

#### POST /api/clinics

Create a new clinic. **Roles**: `it_admin`.

**Request Body** (validated by `createClinicSchema`):

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | string | yes | Min 1 character. |
| `address` | string | no | |
| `city` | string | no | |
| `state` | string | no | Max 2 characters. |
| `zip` | string | no | |
| `phone` | string | no | |
| `npi` | string | no | |
| `pmsType` | string | yes | Min 1 character (e.g. `"opendental"`). |
| `pmsConfig` | object | yes | Key-value record for PMS connection settings. |
| `timezone` | string | no | IANA timezone (e.g. `"America/New_York"`). |

**Response** `201`:

```json
{
  "data": { "...created clinic object" }
}
```

---

#### GET /api/clinics/:id

Get a single clinic. **Roles**: all.

Non-`it_admin` users can only access their own clinic.

**Response** `200`:

```json
{
  "data": { "...clinic object" }
}
```

**Errors**: `404 NOT_FOUND` if the clinic does not exist or is outside the caller's scope.

---

#### PUT /api/clinics/:id

Update a clinic. **Roles**: `it_admin`.

**Request Body** (validated by `updateClinicSchema`):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | string | no | Min 1 character. |
| `address` | string | no | |
| `city` | string | no | |
| `state` | string | no | Max 2 characters. |
| `zip` | string | no | |
| `phone` | string | no | |
| `npi` | string | no | |
| `pmsConfig` | object | no | |
| `status` | string | no | One of: `active`, `inactive`, `setup`. |
| `timezone` | string | no | |

**Response** `200`:

```json
{
  "data": { "...updated clinic object" }
}
```

**Errors**: `404 NOT_FOUND`.

---

#### GET /api/clinics/:id/health

Test the PMS adapter connection for a clinic. **Roles**: `it_admin`, `staff_admin`.

**Response** `200`:

```json
{
  "data": {
    "connected": true
  }
}
```

On connection failure, still returns `200` with:

```json
{
  "data": {
    "connected": false,
    "error": "Connection refused"
  }
}
```

**Errors**: `404 NOT_FOUND` if the clinic does not exist.

---

### Users

#### GET /api/users

List users. **Roles**: `it_admin`, `staff_admin`.

**Query Parameters**: `clinic_id`

Returns user records without `passwordHash`. Staff admins are automatically scoped to their clinic.

**Response** `200`:

```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@clinic.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "role": "staff_user",
      "clinicId": "uuid",
      "isActive": true,
      "lastLoginAt": "2025-04-22T14:30:00Z",
      "createdAt": "2025-01-15T09:00:00Z"
    }
  ]
}
```

---

#### POST /api/users

Create a new user. **Roles**: `it_admin`, `staff_admin`.

**Request Body** (validated by `createUserSchema`):

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | string | yes | Valid email. |
| `firstName` | string | yes | Min 1 character. |
| `lastName` | string | yes | Min 1 character. |
| `password` | string | yes | Min 8 characters. Also validated for strength. |
| `role` | string | yes | One of: `it_admin`, `staff_admin`, `staff_user`. |
| `clinicId` | uuid or null | no | Nullable. |

**Role restrictions for `staff_admin` callers**:
- Cannot create users with `it_admin` role.
- Cannot assign users to a different clinic.
- The new user's `clinicId` is forced to the caller's clinic.

**Response** `201`:

```json
{
  "data": {
    "id": "uuid",
    "email": "new@clinic.com",
    "firstName": "New",
    "lastName": "User",
    "role": "staff_user",
    "clinicId": "uuid",
    "createdAt": "2025-04-23T10:00:00Z"
  }
}
```

**Errors**: `400 VALIDATION_ERROR` if password is too weak. `403 AUTHORIZATION_ERROR` if a staff admin tries to create an IT admin.

---

#### PUT /api/users/:id

Update a user. **Roles**: `it_admin`, `staff_admin`.

**Request Body** (validated by `updateUserSchema`):

| Field | Type | Required |
|-------|------|----------|
| `firstName` | string | no |
| `lastName` | string | no |
| `role` | string | no |
| `isActive` | boolean | no |

**Response** `200`:

```json
{
  "data": {
    "id": "uuid",
    "email": "user@clinic.com",
    "firstName": "Updated",
    "lastName": "Name",
    "role": "staff_user",
    "clinicId": "uuid",
    "isActive": true
  }
}
```

**Errors**: `404 NOT_FOUND`.

---

### Jobs

#### GET /api/jobs

List background jobs. **Roles**: all.

**Query Parameters**: `clinic_id`, `status`, `job_type`, `limit`, `offset`

**Response** `200`:

```json
{
  "data": [ { "...job records" } ],
  "total": 56,
  "limit": 50,
  "offset": 0
}
```

---

#### GET /api/jobs/:id

Get a single job with its execution log. **Roles**: all.

Non-`it_admin` users can only access jobs within their clinic.

**Response** `200`:

```json
{
  "data": { "...job record with execution details" }
}
```

**Errors**: `404 NOT_FOUND`.

---

#### POST /api/jobs/:id/cancel

Cancel a queued or running job. **Roles**: `it_admin`, `staff_admin`.

**Response** `200`:

```json
{
  "success": true
}
```

---

#### POST /api/jobs/:id/retry

Retry a failed job by creating a new job copy with an incremented retry count. **Roles**: `it_admin`, `staff_admin`.

**Response** `200`:

```json
{
  "data": { "...new job record" }
}
```

---

### Notifications

#### GET /api/notifications

List notifications. **Roles**: all.

**Query Parameters**: `clinic_id`, `severity`, `type`, `is_read` (`true` or `false`), `limit`, `offset`

Staff users only see notifications where `targetRoles` is null or includes `"staff_user"`.

**Response** `200`:

```json
{
  "data": [ { "...notification records" } ],
  "total": 23,
  "limit": 50,
  "offset": 0
}
```

---

#### PUT /api/notifications/:id

Update a single notification. **Roles**: all.

**Request Body** (validated by `updateNotificationSchema`):

| Field | Type | Required |
|-------|------|----------|
| `isRead` | boolean | no |
| `isDismissed` | boolean | no |

When `isRead` is set to `true`, the `readAt` timestamp is also set automatically.

**Response** `200`:

```json
{
  "data": { "...updated notification" }
}
```

**Errors**: `404 NOT_FOUND`.

---

#### PUT /api/notifications/mark-all-read

Mark all unread notifications as read for the caller's clinic. **Roles**: all.

**Response** `200`:

```json
{
  "success": true
}
```

---

### Settings

#### GET /api/settings

Get settings, merging system-wide and clinic-specific values. **Roles**: all.

**Query Parameters**: `category`, `clinic_id`

Clinic-specific settings override system-wide settings with the same `category:key`.

**Response** `200`:

```json
{
  "data": [ { "id", "clinicId", "category", "key", "value", "updatedBy", "createdAt", "updatedAt" } ]
}
```

---

#### PUT /api/settings

Create or update (upsert) a setting. **Roles**: `it_admin`, `staff_admin`.

**Request Body** (validated by `updateSettingsSchema`):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `category` | string | yes | Min 1 character. |
| `key` | string | yes | Min 1 character. |
| `value` | any | yes | Stored as JSON. |
| `clinicId` | uuid or null | no | `null` for system-wide settings. |

**Response** `200` (update) or `201` (create):

```json
{
  "data": { "...setting record" }
}
```

---

#### GET /api/settings/payer-configs

List payer adapter configurations for a clinic. **Roles**: `it_admin`, `staff_admin`.

**Query Parameters**: `clinic_id`

Credentials are excluded from the response.

**Response** `200`:

```json
{
  "data": [
    {
      "id": "uuid",
      "clinicId": "uuid",
      "payerName": "Delta Dental",
      "payerType": "commercial",
      "state": "OR",
      "adapterKey": "clearinghouse.dentalxchange",
      "portalUrl": "https://portal.deltadental.com",
      "isEnabled": true,
      "autoVerify": true,
      "timeoutMs": 30000,
      "maxRetries": 3,
      "featuresEnabled": { "eligibility": true, "eob": true, "claims": true },
      "lastHealthCheck": "2025-04-22T12:00:00Z",
      "healthStatus": "healthy",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-04-22T12:00:00Z"
    }
  ]
}
```

Returns an empty array if no `clinic_id` can be resolved.

---

#### PUT /api/settings/payer-configs/:id

Update a payer adapter configuration. **Roles**: `it_admin`, `staff_admin`.

**Request Body** (validated by `updatePayerConfigSchema`):

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `isEnabled` | boolean | no | |
| `autoVerify` | boolean | no | |
| `credentials` | string | no | Encrypted at rest before storage. |
| `portalUrl` | string | no | Must be a valid URL. |
| `timeoutMs` | int | no | Must be positive. |
| `maxRetries` | int | no | 0 to 10. |
| `featuresEnabled` | object | no | Record of string keys to boolean values. |

**Response** `200`:

```json
{
  "data": {
    "id": "uuid",
    "payerName": "Delta Dental",
    "isEnabled": true,
    "autoVerify": true,
    "healthStatus": "healthy",
    "updatedAt": "2025-04-23T10:00:00Z"
  }
}
```

**Errors**: `404 NOT_FOUND`.

---

### Dashboard

#### GET /api/dashboard/kpis

Get role-specific KPI data. **Roles**: all.

**Query Parameters**: `clinic_id`

Response shape varies by the authenticated user's role:

**IT Admin Response**:

```json
{
  "data": {
    "role": "it_admin",
    "totalClinics": 5,
    "totalPatients": 2340,
    "jobsToday": 87,
    "failedJobsToday": 2
  }
}
```

**Staff Admin Response**:

```json
{
  "data": {
    "role": "staff_admin",
    "patientCount": 450,
    "unverifiedInsurance": 23,
    "jobsToday": 15,
    "unreadNotifications": 4
  }
}
```

**Staff User Response**:

```json
{
  "data": {
    "role": "staff_user",
    "jobsCompletedToday": 12,
    "unreadNotifications": 3
  }
}
```

---

### Claims

#### GET /api/claims

List claims from the claims cache. **Roles**: all.

**Query Parameters**: `clinic_id`, `status`, `search`, `patient_id`, `limit`, `offset`

Search matches against `payerName` and `pmsClaimId` (case-insensitive). The `patient_id` parameter filters claims for a specific patient.

**Response** `200`:

```json
{
  "data": [
    {
      "id": "uuid",
      "clinicId": "uuid",
      "patientId": "uuid",
      "pmsClaimId": "CLM-1234",
      "payerName": "Delta Dental",
      "claimType": "primary",
      "status": "paid",
      "amountBilled": "345.00",
      "amountPaid": "248.00",
      "dateSubmitted": "2026-03-10",
      "dateReceived": "2026-03-25",
      "denialCode": null,
      "denialReason": null,
      "procedures": [ { "...procedure objects" } ],
      "patientName": "John Smith",
      "createdAt": "2026-03-10T10:00:00Z",
      "updatedAt": "2026-03-25T14:00:00Z"
    }
  ],
  "total": 28,
  "limit": 50,
  "offset": 0
}
```

---

#### GET /api/claims/:id

Get a single claim with patient name. **Roles**: all.

Non-`it_admin` users can only access claims within their clinic.

**Response** `200`:

```json
{
  "data": { "...claim record with patientName" }
}
```

**Errors**: `404 NOT_FOUND`.

---

### EOBs

#### GET /api/eobs

List Explanation of Benefits records. **Roles**: all.

**Query Parameters**: `clinic_id`, `search`, `triage_status`, `patient_id`, `limit`, `offset`

Search matches against `payerName` and `checkNumber`. The `triage_status` parameter filters by triage workflow state (`pending`, `auto_posted`, `flagged_for_review`, `manually_posted`, `skipped`).

**Response** `200`:

```json
{
  "data": [
    {
      "id": "uuid",
      "clinicId": "uuid",
      "patientId": "uuid",
      "payerName": "Delta Dental",
      "checkNumber": "CHK-445921",
      "checkDate": "2026-03-25",
      "checkAmount": "248.00",
      "receivedDate": "2026-03-25",
      "lineItems": [ { "...line item objects" } ],
      "totalCharged": "345.00",
      "totalPaid": "248.00",
      "totalAdjusted": "35.00",
      "totalPatientResp": "62.00",
      "triageStatus": "pending",
      "postedToPms": false,
      "patientName": "John Smith",
      "createdAt": "2026-03-25T10:00:00Z",
      "updatedAt": "2026-03-25T10:00:00Z"
    }
  ],
  "total": 18,
  "limit": 50,
  "offset": 0
}
```

---

#### GET /api/eobs/:id

Get a single EOB with patient name. **Roles**: all.

Non-`it_admin` users can only access EOBs within their clinic.

**Response** `200`:

```json
{
  "data": { "...EOB record with patientName" }
}
```

**Errors**: `404 NOT_FOUND`.

---

#### POST /api/eobs/sync

Trigger EOB retrieval from all enabled payer configs for a clinic. **Roles**: `it_admin`, `staff_admin`.

**Request Body**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `clinic_id` | uuid | no | Defaults to the caller's assigned clinic. Only effective for `it_admin`. |

**Response** `202`:

```json
{
  "data": { "...job record (jobType: eob_sync)" }
}
```

Creates an `eob_sync` job that retrieves EOBs from all enabled payer adapters, parses them, runs triage rules, and auto-posts eligible records.

**Errors**: `400` if no `clinic_id` can be resolved.

---

#### PUT /api/eobs/:id/review

Approve or reject a flagged EOB after manual review. **Roles**: `it_admin`, `staff_admin`.

**Request Body** (validated by `eobReviewSchema`):

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `action` | `"approve"` or `"reject"` | yes | `approve` posts to PMS; `reject` marks as `skipped`. |
| `notes` | string | no | Free-text review notes. |
| `clinic_id` | uuid | no | Only effective for `it_admin`. |

**Response** `200`:

```json
{
  "data": {
    "id": "uuid",
    "triageStatus": "manually_posted",
    "reviewNotes": "Verified amounts match ERA",
    "postedToPms": true,
    "updatedAt": "2026-04-25T10:00:00Z"
  }
}
```

**Errors**: `404 NOT_FOUND`. `400` if the EOB is not in a reviewable state (`flagged_for_review`).

---

#### POST /api/eobs/:id/post

Post an approved EOB to the PMS. Creates a ClaimPayment and ClaimProc records in OpenDental. **Roles**: `it_admin`, `staff_admin`.

**Request Body**:

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `clinic_id` | uuid | no | Only effective for `it_admin`. |

**Response** `200`:

```json
{
  "data": {
    "success": true,
    "pmsRecordId": "12345"
  }
}
```

On failure, `success` is `false` and an `error` field describes the issue.

**Errors**: `404 NOT_FOUND`. `400` if the EOB has already been posted or is not in an approved/reviewable state.

---

### Recalls

#### GET /api/recalls

List recall-eligible patients (derived from patients with stale sync dates). **Roles**: all.

**Query Parameters**: `clinic_id`, `limit`, `offset`

Recalls are derived from the `patients_cache` table — patients whose `lastSyncedAt` is older than 6 months are considered overdue for recall.

**Response** `200`:

```json
{
  "data": [
    {
      "id": "recall_uuid",
      "patientId": "uuid",
      "patientName": "John Smith",
      "clinicId": "uuid",
      "recallType": "Prophy",
      "dueDate": "2026-01-15",
      "daysOverdue": 100,
      "reminderCount": 0,
      "contactMethod": "email",
      "status": "pending",
      "phone": "503-555-0100",
      "email": "john@example.com"
    }
  ],
  "total": 12,
  "limit": 50,
  "offset": 0
}
```

---

#### POST /api/recalls

Send a recall reminder by queuing a `recall_reminder` job. **Roles**: all.

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `recallId` | string | no | The recall ID (format: `recall_{patientId}`). |
| `patientId` | string | no | The patient UUID. At least one of `recallId` or `patientId` must be provided. |

**Response** `200`:

```json
{
  "success": true,
  "jobId": "uuid"
}
```

---

### Agents

#### GET /api/agents

List local agent status for all visible clinics. **Roles**: `it_admin`, `staff_admin`.

Aggregates clinic data, PMS connection health, and job queue statistics. Each agent entry represents one clinic's local deployment.

**Response** `200`:

```json
{
  "data": [
    {
      "id": "agent_uuid",
      "clinicId": "uuid",
      "clinicName": "Bright Smiles Dental",
      "status": "online",
      "version": "2.4.1",
      "latestVersion": "2.4.1",
      "lastHeartbeat": "2026-04-07T14:34:55Z",
      "jobsInQueue": 3,
      "jobsCompletedToday": 47,
      "openDentalConnected": true,
      "uptime": "—",
      "logs": []
    }
  ]
}
```

The `status` field is `"online"` if the PMS connection test succeeds, `"offline"` otherwise. `logs` is currently empty (future: will include recent agent activity from a dedicated log store).

---

### Webhooks

#### POST /api/webhooks/opendental

Receive webhook events from OpenDental. **Secret-based -- no Bearer token.**

**Security**: Verified via `x-webhook-secret` header or `?secret=` query parameter, matched against the `WEBHOOK_SECRET` environment variable. If `WEBHOOK_SECRET` is not configured, all requests are accepted (with a server-side warning).

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `EventType` | string | yes | e.g. `"PatPlan"` |
| `TableName` | string | yes | e.g. `"patplan"` |
| `KeyNum` | any | yes | Primary key of the affected record. |
| `ClinicId` | string/int | no | Required for job routing. |
| `DateTimeEntry` | string | no | Timestamp of the event. |

**Recognized Events** (trigger eligibility jobs):
- `appointment.created`
- `appointment.updated`
- `patplan.created`
- `patplan.updated`

Unrecognized events return `200` with `{ "received": true, "matched": false }`.

**Response** `200`:

```json
{
  "received": true
}
```

**Errors**: `401` if the secret does not match. `400` if the JSON body is malformed or missing required fields.

---

### Internal

#### POST /api/internal/worker

Process the next queued job. **Service auth -- uses `JWT_SECRET` as a static Bearer token.**

```
Authorization: Bearer {JWT_SECRET}
```

This endpoint is intended to be called by an external scheduler or cron job, not by end users.

**Response** `200`:

```json
{
  "processed": true
}
```

Returns `{ "processed": false }` if no jobs were in the queue.

**Errors**: `401` if the Bearer token does not match `JWT_SECRET`.

---

## Validation Schemas

All request body validation uses [Zod](https://zod.dev/). Schemas are defined in `server/middleware/validators.ts`.

| Schema | Used By | Key Rules |
|--------|---------|-----------|
| `loginSchema` | `POST /auth/login` | `email`: valid email. `password`: min 1 char. |
| `refreshSchema` | `POST /auth/refresh`, `POST /auth/logout` | `refreshToken`: min 1 char. |
| `createUserSchema` | `POST /users` | `email`: valid email. `password`: min 8 chars. `role`: enum. `clinicId`: optional uuid, nullable. |
| `updateUserSchema` | `PUT /users/:id` | All fields optional. `role`: enum if provided. |
| `createClinicSchema` | `POST /clinics` | `name`: min 1. `pmsType`: min 1. `pmsConfig`: required record. `state`: max 2 chars. |
| `updateClinicSchema` | `PUT /clinics/:id` | All fields optional. `status`: enum if provided. |
| `updateSettingsSchema` | `PUT /settings` | `category`: min 1. `key`: min 1. `value`: any. `clinicId`: optional uuid, nullable. |
| `updateNotificationSchema` | `PUT /notifications/:id` | `isRead`: optional boolean. `isDismissed`: optional boolean. |
| `updatePayerConfigSchema` | `PUT /settings/payer-configs/:id` | `portalUrl`: valid URL. `timeoutMs`: positive int. `maxRetries`: 0-10. `featuresEnabled`: record of booleans. |
| `eobReviewSchema` | `PUT /eobs/:id/review` | `action`: enum (`approve`, `reject`). `notes`: optional string. `clinic_id`: optional uuid. |
| `verifyEligibilitySchema` | `POST /eligibility/verify` | `patientId`: uuid. `insuranceId`: uuid. `clinicId`: optional uuid. |

---

## Environment Variables

Required configuration is validated at startup via `server/config/index.ts`.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | PostgreSQL connection string. |
| `DATABASE_SSL` | no | Set to `"true"` for SSL connections. |
| `JWT_SECRET` | yes | Min 32 characters. Used for signing JWTs and as the internal worker auth token. |
| `JWT_EXPIRY` | no | Access token lifetime (default `"15m"`). |
| `REFRESH_TOKEN_EXPIRY_DAYS` | no | Refresh token lifetime in days (default `7`). |
| `BCRYPT_ROUNDS` | no | Password hashing cost (default `12`, range 10-15). |
| `CREDENTIAL_ENCRYPTION_KEY` | yes | Min 32 characters. AES key for encrypting payer credentials at rest. |
| `OD_DEVELOPER_KEY` | yes | OpenDental API developer key. |
| `OD_SANDBOX_CUSTOMER_KEY` | no | OpenDental sandbox customer key. |
| `OD_API_BASE_URL` | no | OpenDental API base URL (default `https://api.opendental.com/api/v1`). |
| `WEBHOOK_SECRET` | no | Shared secret for webhook verification. If unset, all webhooks are accepted. |
| `APP_URL` | no | Application URL (default `http://localhost:3000`). |
| `NODE_ENV` | no | `development`, `production`, or `test`. |
