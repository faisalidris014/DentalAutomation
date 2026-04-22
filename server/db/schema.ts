import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  boolean,
  integer,
  decimal,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';

// ─── Clinics ────────────────────────────────────────────────────────────────

export const clinics = pgTable('clinics', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  address: text(),
  city: text(),
  state: text(),
  zip: text(),
  phone: text(),
  npi: text(),
  pmsType: text('pms_type').notNull(),
  pmsConfig: jsonb('pms_config').notNull(),
  status: text().notNull().default('active'),
  timezone: text().default('America/Chicago'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  email: text().notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  role: text().notNull(),
  clinicId: uuid('clinic_id').references(() => clinics.id),
  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Refresh Tokens ─────────────────────────────────────────────────────────

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  isRevoked: boolean('is_revoked').default(false),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_refresh_token_hash').on(table.tokenHash),
  index('idx_refresh_token_user').on(table.userId),
]);

// ─── Patients Cache ─────────────────────────────────────────────────────────

export const patientsCache = pgTable('patients_cache', {
  id: uuid().primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').references(() => clinics.id).notNull(),
  pmsPatientId: text('pms_patient_id').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  dateOfBirth: date('date_of_birth'),
  gender: text(),
  phoneHome: text('phone_home'),
  phoneCell: text('phone_cell'),
  email: text(),
  address: text(),
  city: text(),
  state: text(),
  zip: text(),
  guarantorId: text('guarantor_id'),
  preferredContact: text('preferred_contact'),
  balance: decimal({ precision: 10, scale: 2 }).default('0'),
  status: text().default('active'),
  lastSyncedAt: timestamp('last_synced_at'),
  pmsRawData: jsonb('pms_raw_data'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  uniqueIndex('idx_patient_clinic_pms').on(table.clinicId, table.pmsPatientId),
]);

// ─── Insurance Cache ────────────────────────────────────────────────────────

export const insuranceCache = pgTable('insurance_cache', {
  id: uuid().primaryKey().defaultRandom(),
  patientId: uuid('patient_id').references(() => patientsCache.id).notNull(),
  clinicId: uuid('clinic_id').references(() => clinics.id).notNull(),
  ordinal: integer().notNull(),
  pmsPatplanId: text('pms_patplan_id'),
  pmsInssubId: text('pms_inssub_id'),
  pmsInsplanId: text('pms_insplan_id'),
  pmsCarrierId: text('pms_carrier_id'),
  carrierName: text('carrier_name'),
  carrierPhone: text('carrier_phone'),
  carrierElectId: text('carrier_elect_id'),
  groupName: text('group_name'),
  groupNumber: text('group_number'),
  subscriberId: text('subscriber_id'),
  subscriberName: text('subscriber_name'),
  planType: text('plan_type'),
  filingCode: text('filing_code'),
  lastVerifiedAt: timestamp('last_verified_at'),
  verificationStatus: text('verification_status'),
  lastSyncedAt: timestamp('last_synced_at'),
  pmsRawData: jsonb('pms_raw_data'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Eligibility Checks ────────────────────────────────────────────────────

export const eligibilityChecks = pgTable('eligibility_checks', {
  id: uuid().primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').references(() => clinics.id).notNull(),
  patientId: uuid('patient_id').references(() => patientsCache.id).notNull(),
  insuranceId: uuid('insurance_id').references(() => insuranceCache.id),
  payerName: text('payer_name').notNull(),
  payerType: text('payer_type').notNull(),
  adapterUsed: text('adapter_used').notNull(),
  trigger: text().notNull(),
  triggeredBy: uuid('triggered_by'),
  status: text().notNull(),
  eligibilityResult: text('eligibility_result'),
  effectiveDate: date('effective_date'),
  terminationDate: date('termination_date'),
  managedCarePlan: text('managed_care_plan'),
  dentalCoverage: boolean('dental_coverage'),
  resultDetails: jsonb('result_details'),
  rawResponse: text('raw_response'),
  errorMessage: text('error_message'),
  writtenToPms: boolean('written_to_pms').default(false),
  pmsWriteResult: text('pms_write_result'),
  pmsInsverifyId: text('pms_insverify_id'),
  durationMs: integer('duration_ms'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_eligibility_clinic_patient').on(table.clinicId, table.patientId, table.createdAt),
]);

// ─── EOB Records ────────────────────────────────────────────────────────────

export const eobRecords = pgTable('eob_records', {
  id: uuid().primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').references(() => clinics.id).notNull(),
  patientId: uuid('patient_id').references(() => patientsCache.id),
  payerName: text('payer_name').notNull(),
  checkNumber: text('check_number'),
  checkDate: date('check_date'),
  checkAmount: decimal('check_amount', { precision: 10, scale: 2 }),
  receivedDate: date('received_date'),
  lineItems: jsonb('line_items').notNull(),
  totalCharged: decimal('total_charged', { precision: 10, scale: 2 }),
  totalPaid: decimal('total_paid', { precision: 10, scale: 2 }),
  totalAdjusted: decimal('total_adjusted', { precision: 10, scale: 2 }),
  totalPatientResp: decimal('total_patient_resp', { precision: 10, scale: 2 }),
  triageStatus: text('triage_status').notNull().default('pending'),
  triageReason: text('triage_reason'),
  reviewedBy: uuid('reviewed_by'),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  postedToPms: boolean('posted_to_pms').default(false),
  pmsClaimPaymentId: text('pms_claim_payment_id'),
  postedAt: timestamp('posted_at'),
  source: text(),
  rawData: jsonb('raw_data'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Claims Cache ───────────────────────────────────────────────────────────

export const claimsCache = pgTable('claims_cache', {
  id: uuid().primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').references(() => clinics.id).notNull(),
  patientId: uuid('patient_id').references(() => patientsCache.id),
  pmsClaimId: text('pms_claim_id'),
  payerName: text('payer_name'),
  claimType: text('claim_type'),
  status: text(),
  amountBilled: decimal('amount_billed', { precision: 10, scale: 2 }),
  amountPaid: decimal('amount_paid', { precision: 10, scale: 2 }),
  dateSubmitted: date('date_submitted'),
  dateReceived: date('date_received'),
  denialCode: text('denial_code'),
  denialReason: text('denial_reason'),
  procedures: jsonb(),
  lastSyncedAt: timestamp('last_synced_at'),
  pmsRawData: jsonb('pms_raw_data'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Jobs ───────────────────────────────────────────────────────────────────

export const jobs = pgTable('jobs', {
  id: uuid().primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').references(() => clinics.id).notNull(),
  jobType: text('job_type').notNull(),
  status: text().notNull().default('queued'),
  priority: integer().default(5),
  triggeredBy: uuid('triggered_by'),
  triggerSource: text('trigger_source'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  durationMs: integer('duration_ms'),
  totalItems: integer('total_items'),
  processedItems: integer('processed_items').default(0),
  failedItems: integer('failed_items').default(0),
  result: jsonb(),
  errorMessage: text('error_message'),
  executionLog: jsonb('execution_log').default([]),
  retryCount: integer('retry_count').default(0),
  maxRetries: integer('max_retries').default(3),
  nextRetryAt: timestamp('next_retry_at'),
  relatedEntityType: text('related_entity_type'),
  relatedEntityId: uuid('related_entity_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_jobs_dequeue').on(table.status, table.priority, table.createdAt),
]);

// ─── Notifications ──────────────────────────────────────────────────────────

export const notifications = pgTable('notifications', {
  id: uuid().primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').references(() => clinics.id),
  userId: uuid('user_id').references(() => users.id),
  type: text().notNull(),
  severity: text().notNull(),
  title: text().notNull(),
  message: text().notNull(),
  relatedEntityType: text('related_entity_type'),
  relatedEntityId: uuid('related_entity_id'),
  actionUrl: text('action_url'),
  isRead: boolean('is_read').default(false),
  isDismissed: boolean('is_dismissed').default(false),
  readAt: timestamp('read_at'),
  targetRoles: jsonb('target_roles'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_notifications_clinic_read').on(table.clinicId, table.isRead, table.createdAt),
]);

// ─── Audit Log ──────────────────────────────────────────────────────────────

export const auditLog = pgTable('audit_log', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  clinicId: uuid('clinic_id').references(() => clinics.id),
  action: text().notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  details: jsonb(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_audit_clinic_time').on(table.clinicId, table.createdAt),
]);

// ─── Payer Configs ──────────────────────────────────────────────────────────

export const payerConfigs = pgTable('payer_configs', {
  id: uuid().primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').references(() => clinics.id).notNull(),
  payerName: text('payer_name').notNull(),
  payerType: text('payer_type').notNull(),
  state: text(),
  adapterKey: text('adapter_key').notNull(),
  portalUrl: text('portal_url'),
  credentials: text(),
  isEnabled: boolean('is_enabled').default(true),
  autoVerify: boolean('auto_verify').default(true),
  timeoutMs: integer('timeout_ms').default(30000),
  maxRetries: integer('max_retries').default(3),
  featuresEnabled: jsonb('features_enabled'),
  lastHealthCheck: timestamp('last_health_check'),
  healthStatus: text('health_status'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ─── Settings ───────────────────────────────────────────────────────────────

export const settings = pgTable('settings', {
  id: uuid().primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').references(() => clinics.id),
  category: text().notNull(),
  key: text().notNull(),
  value: jsonb().notNull(),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  uniqueIndex('idx_settings_clinic_cat_key').on(table.clinicId, table.category, table.key),
]);

// ─── Inferred Types ─────────────────────────────────────────────────────────

export type Clinic = typeof clinics.$inferSelect;
export type NewClinic = typeof clinics.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

export type PatientCache = typeof patientsCache.$inferSelect;
export type NewPatientCache = typeof patientsCache.$inferInsert;

export type InsuranceCache = typeof insuranceCache.$inferSelect;
export type NewInsuranceCache = typeof insuranceCache.$inferInsert;

export type EligibilityCheck = typeof eligibilityChecks.$inferSelect;
export type NewEligibilityCheck = typeof eligibilityChecks.$inferInsert;

export type EobRecord = typeof eobRecords.$inferSelect;
export type NewEobRecord = typeof eobRecords.$inferInsert;

export type ClaimCache = typeof claimsCache.$inferSelect;
export type NewClaimCache = typeof claimsCache.$inferInsert;

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;

export type PayerConfig = typeof payerConfigs.$inferSelect;
export type NewPayerConfig = typeof payerConfigs.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
