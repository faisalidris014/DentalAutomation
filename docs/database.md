# Database Schema Reference

DentalFlow uses **Drizzle ORM** with **PostgreSQL**. The schema is defined in `server/db/schema.ts` and contains 13 tables organized around multi-tenant dental practice management.

---

## Table of Contents

1. [clinics](#1-clinics)
2. [users](#2-users)
3. [refresh_tokens](#3-refresh_tokens)
4. [patients_cache](#4-patients_cache)
5. [insurance_cache](#5-insurance_cache)
6. [eligibility_checks](#6-eligibility_checks)
7. [eob_records](#7-eob_records)
8. [claims_cache](#8-claims_cache)
9. [jobs](#9-jobs)
10. [notifications](#10-notifications)
11. [audit_log](#11-audit_log)
12. [payer_configs](#12-payer_configs)
13. [settings](#13-settings)
14. [Entity Relationships](#entity-relationships)
15. [Inferred Types](#inferred-types)
16. [Migration Workflow](#migration-workflow)

---

## 1. clinics

Dental practice locations and PMS configuration. Serves as the **tenant boundary** for multi-tenancy -- nearly every other table references `clinics.id`.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom` |
| `name` | `text` | NOT NULL |
| `address` | `text` | |
| `city` | `text` | |
| `state` | `text` | |
| `zip` | `text` | |
| `phone` | `text` | |
| `npi` | `text` | |
| `pms_type` | `text` | NOT NULL (e.g., `'opendental'`) |
| `pms_config` | `jsonb` | NOT NULL |
| `status` | `text` | NOT NULL, default `'active'` |
| `timezone` | `text` | default `'America/Chicago'` |
| `created_at` | `timestamp` | `defaultNow` |
| `updated_at` | `timestamp` | `defaultNow` |

**`pms_config` shape:**

```json
{
  "api_mode": "string",
  "base_url": "string",
  "developer_key": "string",
  "customer_key": "string",
  "econnector_url": "string",
  "api_tier": "string",
  "last_sync_at": "string",
  "sync_interval_minutes": "number"
}
```

**`status` values:** `active`, `inactive`, `setup`

---

## 2. users

Staff accounts with role-based access control.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom` |
| `email` | `text` | NOT NULL, UNIQUE |
| `password_hash` | `text` | NOT NULL |
| `first_name` | `text` | NOT NULL |
| `last_name` | `text` | NOT NULL |
| `role` | `text` | NOT NULL |
| `clinic_id` | `uuid` | FK -> `clinics.id` (nullable for `it_admin`) |
| `is_active` | `boolean` | default `true` |
| `last_login_at` | `timestamp` | |
| `created_at` | `timestamp` | `defaultNow` |
| `updated_at` | `timestamp` | `defaultNow` |

**`role` values:** `it_admin`, `staff_admin`, `staff_user`

---

## 3. refresh_tokens

JWT refresh token management with revocation tracking.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom` |
| `user_id` | `uuid` | FK -> `users.id` (cascade delete), NOT NULL |
| `token_hash` | `text` | NOT NULL |
| `expires_at` | `timestamp` | NOT NULL |
| `is_revoked` | `boolean` | default `false` |
| `created_at` | `timestamp` | `defaultNow` |

**Indexes:**

| Name | Columns |
|------|---------|
| `idx_refresh_token_hash` | `token_hash` |
| `idx_refresh_token_user` | `user_id` |

---

## 4. patients_cache

Patient demographics synced from PMS. This is a **cache table** refreshed by the sync engine -- the PMS remains the source of truth.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom` |
| `clinic_id` | `uuid` | FK -> `clinics.id`, NOT NULL |
| `pms_patient_id` | `text` | NOT NULL |
| `first_name` | `text` | NOT NULL |
| `last_name` | `text` | NOT NULL |
| `date_of_birth` | `date` | |
| `gender` | `text` | |
| `phone_home` | `text` | |
| `phone_cell` | `text` | |
| `email` | `text` | |
| `address` | `text` | |
| `city` | `text` | |
| `state` | `text` | |
| `zip` | `text` | |
| `guarantor_id` | `text` | |
| `preferred_contact` | `text` | |
| `balance` | `decimal(10,2)` | default `'0'` |
| `status` | `text` | default `'active'` |
| `last_synced_at` | `timestamp` | |
| `pms_raw_data` | `jsonb` | |
| `created_at` | `timestamp` | `defaultNow` |
| `updated_at` | `timestamp` | `defaultNow` |

**`status` values:** `active`, `inactive`, `archived`

**Indexes:**

| Name | Columns | Type |
|------|---------|------|
| `idx_patient_clinic_pms` | `clinic_id`, `pms_patient_id` | UNIQUE |

---

## 5. insurance_cache

Patient insurance plans synced from PMS. The `ordinal` column distinguishes primary (1) from secondary (2) coverage.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom` |
| `patient_id` | `uuid` | FK -> `patients_cache.id`, NOT NULL |
| `clinic_id` | `uuid` | FK -> `clinics.id`, NOT NULL |
| `ordinal` | `integer` | NOT NULL (1 = primary, 2 = secondary) |
| `pms_patplan_id` | `text` | |
| `pms_inssub_id` | `text` | |
| `pms_insplan_id` | `text` | |
| `pms_carrier_id` | `text` | |
| `carrier_name` | `text` | |
| `carrier_phone` | `text` | |
| `carrier_elect_id` | `text` | |
| `group_name` | `text` | |
| `group_number` | `text` | |
| `subscriber_id` | `text` | |
| `subscriber_name` | `text` | |
| `plan_type` | `text` | |
| `filing_code` | `text` | |
| `last_verified_at` | `timestamp` | |
| `verification_status` | `text` | |
| `last_synced_at` | `timestamp` | |
| `pms_raw_data` | `jsonb` | |
| `created_at` | `timestamp` | `defaultNow` |
| `updated_at` | `timestamp` | `defaultNow` |

**`verification_status` values:** `active`, `inactive`, `stale`, `unknown`

---

## 6. eligibility_checks

Insurance eligibility verification transaction records. Each row represents a single verification attempt against a payer.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom` |
| `clinic_id` | `uuid` | FK -> `clinics.id`, NOT NULL |
| `patient_id` | `uuid` | FK -> `patients_cache.id`, NOT NULL |
| `insurance_id` | `uuid` | FK -> `insurance_cache.id` |
| `payer_name` | `text` | NOT NULL |
| `payer_type` | `text` | NOT NULL |
| `adapter_used` | `text` | NOT NULL |
| `trigger` | `text` | NOT NULL |
| `triggered_by` | `uuid` | |
| `status` | `text` | NOT NULL |
| `eligibility_result` | `text` | |
| `effective_date` | `date` | |
| `termination_date` | `date` | |
| `managed_care_plan` | `text` | |
| `dental_coverage` | `boolean` | |
| `result_details` | `jsonb` | |
| `raw_response` | `text` | Audit trail |
| `error_message` | `text` | |
| `written_to_pms` | `boolean` | default `false` |
| `pms_write_result` | `text` | |
| `pms_insverify_id` | `text` | |
| `duration_ms` | `integer` | |
| `started_at` | `timestamp` | |
| `completed_at` | `timestamp` | |
| `created_at` | `timestamp` | `defaultNow` |

**`payer_type` values:** `commercial`, `medicaid`, `unknown`

**`adapter_used` examples:** `'clearinghouse.dentalxchange'`, `'manual_review'`

**`trigger` values:** `batch_nightly`, `batch_recheck`, `on_demand`, `webhook`

**`status` values:** `completed`, `failed`

**`eligibility_result` values:** `active`, `inactive`, `unknown`, `pending`

**`pms_write_result` values:** `success`, `failed`, `skipped_*`

**`result_details` shape:**

```json
{
  "annualMaximum": "number",
  "annualMaximumUsed": "number",
  "deductible": "number",
  "deductibleMet": "number",
  "coveragePercentages": {
    "preventive": "number",
    "basic": "number",
    "major": "number",
    "ortho": "number"
  },
  "copays": [
    { "category": "string", "amount": "number" }
  ],
  "waitingPeriods": [
    { "category": "string", "endDate": "string" }
  ]
}
```

**Indexes:**

| Name | Columns |
|------|---------|
| `idx_eligibility_clinic_patient` | `clinic_id`, `patient_id`, `created_at` |

---

## 7. eob_records

Explanation of Benefits records. **Phase 3 feature.**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom` |
| `clinic_id` | `uuid` | FK -> `clinics.id`, NOT NULL |
| `patient_id` | `uuid` | FK -> `patients_cache.id` |
| `payer_name` | `text` | NOT NULL |
| `check_number` | `text` | |
| `check_date` | `date` | |
| `check_amount` | `decimal(10,2)` | |
| `received_date` | `date` | |
| `line_items` | `jsonb` | NOT NULL |
| `total_charged` | `decimal(10,2)` | |
| `total_paid` | `decimal(10,2)` | |
| `total_adjusted` | `decimal(10,2)` | |
| `total_patient_resp` | `decimal(10,2)` | |
| `triage_status` | `text` | NOT NULL, default `'pending'` |
| `triage_reason` | `text` | |
| `reviewed_by` | `uuid` | |
| `reviewed_at` | `timestamp` | |
| `review_notes` | `text` | |
| `posted_to_pms` | `boolean` | default `false` |
| `pms_claim_payment_id` | `text` | |
| `posted_at` | `timestamp` | |
| `source` | `text` | |
| `raw_data` | `jsonb` | |
| `created_at` | `timestamp` | `defaultNow` |
| `updated_at` | `timestamp` | `defaultNow` |

**`triage_status` values:** `pending`, `auto_posted`, `flagged_for_review`, `manually_posted`, `skipped`

---

## 8. claims_cache

Claim submission records synced from PMS. **Phase 2 feature.**

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom` |
| `clinic_id` | `uuid` | FK -> `clinics.id`, NOT NULL |
| `patient_id` | `uuid` | FK -> `patients_cache.id` |
| `pms_claim_id` | `text` | |
| `payer_name` | `text` | |
| `claim_type` | `text` | |
| `status` | `text` | |
| `amount_billed` | `decimal(10,2)` | |
| `amount_paid` | `decimal(10,2)` | |
| `date_submitted` | `date` | |
| `date_received` | `date` | |
| `denial_code` | `text` | |
| `denial_reason` | `text` | |
| `procedures` | `jsonb` | |
| `last_synced_at` | `timestamp` | |
| `pms_raw_data` | `jsonb` | |
| `created_at` | `timestamp` | `defaultNow` |
| `updated_at` | `timestamp` | `defaultNow` |

---

## 9. jobs

Background job queue with retry logic and execution logging.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom` |
| `clinic_id` | `uuid` | FK -> `clinics.id`, NOT NULL |
| `job_type` | `text` | NOT NULL |
| `status` | `text` | NOT NULL, default `'queued'` |
| `priority` | `integer` | default `5` |
| `triggered_by` | `uuid` | |
| `trigger_source` | `text` | |
| `started_at` | `timestamp` | |
| `completed_at` | `timestamp` | |
| `duration_ms` | `integer` | |
| `total_items` | `integer` | |
| `processed_items` | `integer` | default `0` |
| `failed_items` | `integer` | default `0` |
| `result` | `jsonb` | |
| `error_message` | `text` | |
| `execution_log` | `jsonb` | default `[]` |
| `retry_count` | `integer` | default `0` |
| `max_retries` | `integer` | default `3` |
| `next_retry_at` | `timestamp` | |
| `related_entity_type` | `text` | |
| `related_entity_id` | `uuid` | |
| `created_at` | `timestamp` | `defaultNow` |
| `updated_at` | `timestamp` | `defaultNow` |

**`status` values:** `queued`, `running`, `completed`, `failed`, `retrying`, `cancelled`

**`trigger_source` values:** `scheduler`, `webhook`, `manual`, `retry`

**Indexes:**

| Name | Columns | Notes |
|------|---------|-------|
| `idx_jobs_dequeue` | `status`, `priority`, `created_at` | Optimizes job polling |

---

## 10. notifications

In-app alerts for users, filterable by role.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom` |
| `clinic_id` | `uuid` | FK -> `clinics.id` |
| `user_id` | `uuid` | FK -> `users.id` |
| `type` | `text` | NOT NULL |
| `severity` | `text` | NOT NULL |
| `title` | `text` | NOT NULL |
| `message` | `text` | NOT NULL |
| `related_entity_type` | `text` | |
| `related_entity_id` | `uuid` | |
| `action_url` | `text` | |
| `is_read` | `boolean` | default `false` |
| `is_dismissed` | `boolean` | default `false` |
| `read_at` | `timestamp` | |
| `target_roles` | `jsonb` | Array of role strings |
| `created_at` | `timestamp` | `defaultNow` |

**`severity` values:** `info`, `warning`, `error`

**Indexes:**

| Name | Columns |
|------|---------|
| `idx_notifications_clinic_read` | `clinic_id`, `is_read`, `created_at` |

---

## 11. audit_log

HIPAA compliance audit trail. Every API action is logged here.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom` |
| `user_id` | `uuid` | FK -> `users.id` |
| `clinic_id` | `uuid` | FK -> `clinics.id` |
| `action` | `text` | NOT NULL |
| `entity_type` | `text` | |
| `entity_id` | `text` | |
| `details` | `jsonb` | |
| `ip_address` | `text` | |
| `user_agent` | `text` | |
| `created_at` | `timestamp` | `defaultNow` |

**`details` shape:**

```json
{
  "method": "string",
  "path": "string",
  "query": "object",
  "statusCode": "number"
}
```

**Indexes:**

| Name | Columns |
|------|---------|
| `idx_audit_clinic_time` | `clinic_id`, `created_at` |

---

## 12. payer_configs

Per-clinic insurance payer adapter configuration. Credentials are stored encrypted.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom` |
| `clinic_id` | `uuid` | FK -> `clinics.id`, NOT NULL |
| `payer_name` | `text` | NOT NULL |
| `payer_type` | `text` | NOT NULL |
| `state` | `text` | |
| `adapter_key` | `text` | NOT NULL |
| `portal_url` | `text` | |
| `credentials` | `text` | Encrypted |
| `is_enabled` | `boolean` | default `true` |
| `auto_verify` | `boolean` | default `true` |
| `timeout_ms` | `integer` | default `30000` |
| `max_retries` | `integer` | default `3` |
| `features_enabled` | `jsonb` | |
| `last_health_check` | `timestamp` | |
| `health_status` | `text` | |
| `created_at` | `timestamp` | `defaultNow` |
| `updated_at` | `timestamp` | `defaultNow` |

**`payer_type` values:** `commercial`, `medicaid`

**`adapter_key` examples:** `'clearinghouse.dentalxchange'`

**`features_enabled` shape:**

```json
{
  "eligibility": true,
  "eob": true,
  "claims": true
}
```

**`health_status` values:** `healthy`, `degraded`, `down`

---

## 13. settings

Key-value configuration store. Rows with `clinic_id = NULL` are global settings; rows with a `clinic_id` are scoped to that clinic.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | `uuid` | PK, `defaultRandom` |
| `clinic_id` | `uuid` | FK -> `clinics.id` (nullable) |
| `category` | `text` | NOT NULL |
| `key` | `text` | NOT NULL |
| `value` | `jsonb` | NOT NULL |
| `updated_by` | `uuid` | FK -> `users.id` |
| `created_at` | `timestamp` | `defaultNow` |
| `updated_at` | `timestamp` | `defaultNow` |

**Indexes:**

| Name | Columns | Type |
|------|---------|------|
| `idx_settings_clinic_cat_key` | `clinic_id`, `category`, `key` | UNIQUE |

---

## Entity Relationships

```
clinics (tenant root)
  |-- users (many per clinic; nullable for it_admin)
  |     |-- refresh_tokens (cascade delete)
  |     |-- notifications (direct user alerts)
  |     |-- audit_log (action attribution)
  |     |-- settings (updated_by)
  |
  |-- patients_cache (synced from PMS)
  |     |-- insurance_cache (1:N per patient, ordinal-ranked)
  |     |     |-- eligibility_checks (verification records)
  |     |-- eligibility_checks (also linked directly)
  |     |-- eob_records
  |     |-- claims_cache
  |
  |-- jobs (background processing)
  |-- notifications (clinic-wide alerts)
  |-- audit_log (compliance trail)
  |-- payer_configs (adapter credentials)
  |-- settings (clinic-scoped config)
  |-- eob_records
  |-- claims_cache
```

All foreign keys reference `clinics.id` to enforce multi-tenancy at the database level. The only cascade delete is `users -> refresh_tokens`.

---

## Inferred Types

Each table exports `Select` and `Insert` types via Drizzle's `$inferSelect` / `$inferInsert`:

```typescript
import {
  Clinic, NewClinic,
  User, NewUser,
  RefreshToken, NewRefreshToken,
  PatientCache, NewPatientCache,
  InsuranceCache, NewInsuranceCache,
  EligibilityCheck, NewEligibilityCheck,
  EobRecord, NewEobRecord,
  ClaimCache, NewClaimCache,
  Job, NewJob,
  Notification, NewNotification,
  AuditLogEntry, NewAuditLogEntry,
  PayerConfig, NewPayerConfig,
  Setting, NewSetting,
} from './schema';
```

---

## Migration Workflow

1. Edit `server/db/schema.ts`
2. Run `npm run db:generate` to create migration SQL
3. Review generated SQL in `server/db/migrations/`
4. Run `npm run db:migrate` to apply
5. For dev-only quick iteration: `npm run db:push` (no migration file generated)
