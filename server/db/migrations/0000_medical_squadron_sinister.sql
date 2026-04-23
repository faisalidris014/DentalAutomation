CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"clinic_id" uuid,
	"action" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"details" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "claims_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_id" uuid,
	"pms_claim_id" text,
	"payer_name" text,
	"claim_type" text,
	"status" text,
	"amount_billed" numeric(10, 2),
	"amount_paid" numeric(10, 2),
	"date_submitted" date,
	"date_received" date,
	"denial_code" text,
	"denial_reason" text,
	"procedures" jsonb,
	"last_synced_at" timestamp,
	"pms_raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "clinics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"phone" text,
	"npi" text,
	"pms_type" text NOT NULL,
	"pms_config" jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"timezone" text DEFAULT 'America/Chicago',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "eligibility_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"insurance_id" uuid,
	"payer_name" text NOT NULL,
	"payer_type" text NOT NULL,
	"adapter_used" text NOT NULL,
	"trigger" text NOT NULL,
	"triggered_by" uuid,
	"status" text NOT NULL,
	"eligibility_result" text,
	"effective_date" date,
	"termination_date" date,
	"managed_care_plan" text,
	"dental_coverage" boolean,
	"result_details" jsonb,
	"raw_response" text,
	"error_message" text,
	"written_to_pms" boolean DEFAULT false,
	"pms_write_result" text,
	"pms_insverify_id" text,
	"duration_ms" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "eob_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"patient_id" uuid,
	"payer_name" text NOT NULL,
	"check_number" text,
	"check_date" date,
	"check_amount" numeric(10, 2),
	"received_date" date,
	"line_items" jsonb NOT NULL,
	"total_charged" numeric(10, 2),
	"total_paid" numeric(10, 2),
	"total_adjusted" numeric(10, 2),
	"total_patient_resp" numeric(10, 2),
	"triage_status" text DEFAULT 'pending' NOT NULL,
	"triage_reason" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"review_notes" text,
	"posted_to_pms" boolean DEFAULT false,
	"pms_claim_payment_id" text,
	"posted_at" timestamp,
	"source" text,
	"raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "insurance_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"clinic_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"pms_patplan_id" text,
	"pms_inssub_id" text,
	"pms_insplan_id" text,
	"pms_carrier_id" text,
	"carrier_name" text,
	"carrier_phone" text,
	"carrier_elect_id" text,
	"group_name" text,
	"group_number" text,
	"subscriber_id" text,
	"subscriber_name" text,
	"plan_type" text,
	"filing_code" text,
	"last_verified_at" timestamp,
	"verification_status" text,
	"last_synced_at" timestamp,
	"pms_raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"job_type" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"priority" integer DEFAULT 5,
	"triggered_by" uuid,
	"trigger_source" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"total_items" integer,
	"processed_items" integer DEFAULT 0,
	"failed_items" integer DEFAULT 0,
	"result" jsonb,
	"error_message" text,
	"execution_log" jsonb DEFAULT '[]'::jsonb,
	"retry_count" integer DEFAULT 0,
	"max_retries" integer DEFAULT 3,
	"next_retry_at" timestamp,
	"related_entity_type" text,
	"related_entity_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid,
	"user_id" uuid,
	"type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"related_entity_type" text,
	"related_entity_id" uuid,
	"action_url" text,
	"is_read" boolean DEFAULT false,
	"is_dismissed" boolean DEFAULT false,
	"read_at" timestamp,
	"target_roles" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "patients_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"pms_patient_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"date_of_birth" date,
	"gender" text,
	"phone_home" text,
	"phone_cell" text,
	"email" text,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"guarantor_id" text,
	"preferred_contact" text,
	"balance" numeric(10, 2) DEFAULT '0',
	"status" text DEFAULT 'active',
	"last_synced_at" timestamp,
	"pms_raw_data" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payer_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL,
	"payer_name" text NOT NULL,
	"payer_type" text NOT NULL,
	"state" text,
	"adapter_key" text NOT NULL,
	"portal_url" text,
	"credentials" text,
	"is_enabled" boolean DEFAULT true,
	"auto_verify" boolean DEFAULT true,
	"timeout_ms" integer DEFAULT 30000,
	"max_retries" integer DEFAULT 3,
	"features_enabled" jsonb,
	"last_health_check" timestamp,
	"health_status" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_revoked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid,
	"category" text NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"role" text NOT NULL,
	"clinic_id" uuid,
	"is_active" boolean DEFAULT true,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims_cache" ADD CONSTRAINT "claims_cache_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims_cache" ADD CONSTRAINT "claims_cache_patient_id_patients_cache_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients_cache"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_patient_id_patients_cache_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients_cache"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eligibility_checks" ADD CONSTRAINT "eligibility_checks_insurance_id_insurance_cache_id_fk" FOREIGN KEY ("insurance_id") REFERENCES "public"."insurance_cache"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eob_records" ADD CONSTRAINT "eob_records_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eob_records" ADD CONSTRAINT "eob_records_patient_id_patients_cache_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients_cache"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_cache" ADD CONSTRAINT "insurance_cache_patient_id_patients_cache_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients_cache"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_cache" ADD CONSTRAINT "insurance_cache_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients_cache" ADD CONSTRAINT "patients_cache_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payer_configs" ADD CONSTRAINT "payer_configs_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_clinic_id_clinics_id_fk" FOREIGN KEY ("clinic_id") REFERENCES "public"."clinics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_audit_clinic_time" ON "audit_log" USING btree ("clinic_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_eligibility_clinic_patient" ON "eligibility_checks" USING btree ("clinic_id","patient_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_dequeue" ON "jobs" USING btree ("status","priority","created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_clinic_read" ON "notifications" USING btree ("clinic_id","is_read","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_patient_clinic_pms" ON "patients_cache" USING btree ("clinic_id","pms_patient_id");--> statement-breakpoint
CREATE INDEX "idx_refresh_token_hash" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_refresh_token_user" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_settings_clinic_cat_key" ON "settings" USING btree ("clinic_id","category","key");