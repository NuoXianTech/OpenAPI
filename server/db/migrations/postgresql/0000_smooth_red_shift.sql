CREATE TABLE "credit_transactions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reason" varchar(50) NOT NULL,
	"api_id" integer,
	"api_call_id" bigint,
	"code_id" integer,
	"operator_id" integer,
	"operator_name" varchar(140),
	"ip" varchar(45),
	"remark" varchar(500),
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redemption_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code_digest" varchar(64) NOT NULL,
	"code_ciphertext" varchar(512) NOT NULL,
	"code_preview" varchar(32) NOT NULL,
	"amount" integer NOT NULL,
	"batch_id" varchar(64),
	"note" varchar(500),
	"max_uses" integer DEFAULT 1 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "redemption_codes_code_digest_unique" UNIQUE("code_digest"),
	CONSTRAINT "redemption_codes_amount_chk" CHECK ("redemption_codes"."amount" > 0),
	CONSTRAINT "redemption_codes_max_uses_chk" CHECK ("redemption_codes"."max_uses" > 0),
	CONSTRAINT "redemption_codes_used_count_chk" CHECK ("redemption_codes"."used_count" >= 0 and "redemption_codes"."used_count" <= "redemption_codes"."max_uses")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"role" varchar(20) DEFAULT 'user' NOT NULL,
	"username" varchar(50) NOT NULL,
	"display_name" varchar(100),
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"locale" varchar(16),
	"credits" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"banned_reason" varchar(500),
	"banned_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"last_login_ip" varchar(45),
	"last_login_user_agent" varchar(500),
	"last_checkin_at" timestamp with time zone,
	"email_verified_at" timestamp with time zone,
	"token_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_role_chk" CHECK ("users"."role" in ('user', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"provider" varchar(32) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"nickname" varchar(140),
	"avatar_url" varchar(1000),
	"email" varchar(255),
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	"last_login_ip" varchar(45),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_call_stats" (
	"api_id" integer NOT NULL,
	"stat_date" date NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_call_stats_api_id_stat_date_pk" PRIMARY KEY("api_id","stat_date"),
	CONSTRAINT "api_call_stats_counts_chk" CHECK ("api_call_stats"."total_count" >= 0 and "api_call_stats"."success_count" >= 0 and "api_call_stats"."failure_count" >= 0 and "api_call_stats"."success_count" + "api_call_stats"."failure_count" = "api_call_stats"."total_count")
);
--> statement-breakpoint
CREATE TABLE "api_calls" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"request_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"api_id" integer NOT NULL,
	"api_key_id" integer,
	"api_key_name" varchar(100),
	"user_id" integer,
	"path" varchar(1000) NOT NULL,
	"method" varchar(10) NOT NULL,
	"query_string" varchar(2000),
	"status_code" integer NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"ip" varchar(45),
	"user_agent" varchar(500),
	"referer" varchar(1000),
	"request_size" integer,
	"response_size" integer,
	"error_code" varchar(50),
	"error_message" varchar(500),
	"credits_cost" integer DEFAULT 0 NOT NULL,
	"is_counted" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_calls_status_code_chk" CHECK ("api_calls"."status_code" between 100 and 599),
	CONSTRAINT "api_calls_latency_ms_chk" CHECK ("api_calls"."latency_ms" >= 0),
	CONSTRAINT "api_calls_request_size_chk" CHECK ("api_calls"."request_size" is null or "api_calls"."request_size" >= 0),
	CONSTRAINT "api_calls_response_size_chk" CHECK ("api_calls"."response_size" is null or "api_calls"."response_size" >= 0),
	CONSTRAINT "api_calls_credits_cost_chk" CHECK ("api_calls"."credits_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "api_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(120),
	"color" varchar(20),
	"parent_id" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_daily_quota_usage" (
	"api_id" integer NOT NULL,
	"usage_date" date NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_daily_quota_usage_api_id_usage_date_pk" PRIMARY KEY("api_id","usage_date"),
	CONSTRAINT "api_daily_quota_usage_count_chk" CHECK ("api_daily_quota_usage"."used_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"key_digest" varchar(64) NOT NULL,
	"key_ciphertext" text NOT NULL,
	"key_preview" varchar(32) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"scopes" jsonb,
	"ip_whitelist" jsonb,
	"total_quota" integer,
	"used_credits" integer DEFAULT 0 NOT NULL,
	"total_calls" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"last_used_ip" varchar(45),
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_key_digest_unique" UNIQUE("key_digest"),
	CONSTRAINT "api_keys_total_quota_chk" CHECK ("api_keys"."total_quota" is null or "api_keys"."total_quota" >= 0),
	CONSTRAINT "api_keys_used_credits_chk" CHECK ("api_keys"."used_credits" >= 0),
	CONSTRAINT "api_keys_total_calls_chk" CHECK ("api_keys"."total_calls" >= 0)
);
--> statement-breakpoint
CREATE TABLE "apis" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"path_version" varchar(8) DEFAULT 'v1' NOT NULL,
	"endpoint_count" integer DEFAULT 0 NOT NULL,
	"name" varchar(100) NOT NULL,
	"status" integer DEFAULT 4 NOT NULL,
	"category_id" integer,
	"short_desc" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"http_method" varchar(50) NOT NULL,
	"api_path" varchar(200) NOT NULL,
	"doc_url" varchar(200) NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"is_api_key" boolean DEFAULT false NOT NULL,
	"is_statistics" boolean DEFAULT false NOT NULL,
	"is_orphaned" boolean DEFAULT false NOT NULL,
	"rate_limit_per_second" integer DEFAULT 0 NOT NULL,
	"rate_limit_per_minute" integer DEFAULT 0 NOT NULL,
	"rate_limit_per_hour" integer DEFAULT 0 NOT NULL,
	"rate_limit_per_day" integer DEFAULT 0 NOT NULL,
	"method_costs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"capability_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"capability_revision" integer DEFAULT 0 NOT NULL,
	"capability_updated_at" timestamp with time zone,
	"daily_quota" integer DEFAULT 0 NOT NULL,
	"timeout_ms" integer DEFAULT 10000 NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apis_status_chk" CHECK ("apis"."status" in (-1, 0, 1, 2, 3, 4)),
	CONSTRAINT "apis_endpoint_count_chk" CHECK ("apis"."endpoint_count" >= 0),
	CONSTRAINT "apis_rate_limits_chk" CHECK ("apis"."rate_limit_per_second" >= 0 and "apis"."rate_limit_per_minute" >= 0 and "apis"."rate_limit_per_hour" >= 0 and "apis"."rate_limit_per_day" >= 0),
	CONSTRAINT "apis_capability_revision_chk" CHECK ("apis"."capability_revision" >= 0),
	CONSTRAINT "apis_daily_quota_chk" CHECK ("apis"."daily_quota" >= 0),
	CONSTRAINT "apis_timeout_ms_chk" CHECK ("apis"."timeout_ms" between 100 and 120000)
);
--> statement-breakpoint
CREATE TABLE "pending_charges" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_call_id" bigint NOT NULL,
	"user_id" integer NOT NULL,
	"api_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"remark" varchar(500),
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" varchar(500),
	"last_attempt_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_charges_status_chk" CHECK ("pending_charges"."status" in ('pending', 'dead_letter')),
	CONSTRAINT "pending_charges_amount_chk" CHECK ("pending_charges"."amount" > 0),
	CONSTRAINT "pending_charges_attempts_chk" CHECK ("pending_charges"."attempts" >= 0)
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"level" varchar(20) DEFAULT 'info' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"link_url" varchar(1000),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcements_level_chk" CHECK ("announcements"."level" in ('info', 'success', 'warning', 'critical'))
);
--> statement-breakpoint
CREATE TABLE "friend_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(140) NOT NULL,
	"url" varchar(1000) NOT NULL,
	"description" text,
	"logo_url" varchar(1000),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"recipient_user_id" integer NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"level" varchar(20) DEFAULT 'info' NOT NULL,
	"link_url" varchar(1000),
	"audience" varchar(20) DEFAULT 'specific' NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sender_user_id" integer,
	"sender_actor" varchar(140),
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_messages_level_chk" CHECK ("notification_messages"."level" in ('info', 'success', 'warning', 'critical')),
	CONSTRAINT "notification_messages_audience_chk" CHECK ("notification_messages"."audience" in ('specific', 'all_current', 'all_with_future')),
	CONSTRAINT "notification_messages_recipient_count_chk" CHECK ("notification_messages"."recipient_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "operation_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"actor" varchar(140),
	"action" varchar(80) NOT NULL,
	"resource_type" varchar(80),
	"resource_id" varchar(120),
	"ip" varchar(45),
	"user_agent" varchar(500),
	"detail" jsonb,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "operation_logs_status_chk" CHECK ("operation_logs"."status" in ('success', 'failure'))
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"setting_key" varchar(150) PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"description" varchar(500) DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_call_stats" ADD CONSTRAINT "api_call_stats_api_id_apis_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."apis"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_calls" ADD CONSTRAINT "api_calls_api_id_apis_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."apis"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_categories" ADD CONSTRAINT "api_categories_parent_id_api_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."api_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_daily_quota_usage" ADD CONSTRAINT "api_daily_quota_usage_api_id_apis_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."apis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apis" ADD CONSTRAINT "apis_category_id_api_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."api_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_charges" ADD CONSTRAINT "pending_charges_api_call_id_api_calls_id_fk" FOREIGN KEY ("api_call_id") REFERENCES "public"."api_calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_charges" ADD CONSTRAINT "pending_charges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_charges" ADD CONSTRAINT "pending_charges_api_id_apis_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."apis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_message_id_notification_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."notification_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_transactions_created_at_idx" ON "credit_transactions" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "credit_transactions_user_created_idx" ON "credit_transactions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "credit_transactions_reason_idx" ON "credit_transactions" USING btree ("reason");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_transactions_api_call_reason_uq" ON "credit_transactions" USING btree ("api_call_id","reason") WHERE "credit_transactions"."api_call_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "credit_transactions_redemption_user_uq" ON "credit_transactions" USING btree ("code_id","user_id") WHERE "credit_transactions"."reason" = 'redemption_code' AND "credit_transactions"."code_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "redemption_codes_batch_idx" ON "redemption_codes" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "redemption_codes_enabled_expires_idx" ON "redemption_codes" USING btree ("is_enabled","expires_at");--> statement-breakpoint
CREATE INDEX "redemption_codes_created_at_idx" ON "redemption_codes" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_uq" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_active_banned_idx" ON "users" USING btree ("is_active","is_banned");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_accounts_provider_pid_uq" ON "oauth_accounts" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_accounts_user_provider_uq" ON "oauth_accounts" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "api_call_stats_stat_date_idx" ON "api_call_stats" USING btree ("stat_date");--> statement-breakpoint
CREATE INDEX "api_calls_created_at_idx" ON "api_calls" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "api_calls_api_id_created_at_idx" ON "api_calls" USING btree ("api_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "api_calls_user_created_at_idx" ON "api_calls" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "api_calls_api_key_created_at_idx" ON "api_calls" USING btree ("api_key_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "api_calls_request_id_idx" ON "api_calls" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_categories_code_uq" ON "api_categories" USING btree ("code");--> statement-breakpoint
CREATE INDEX "api_categories_parent_sort_idx" ON "api_categories" USING btree ("parent_id","sort_order");--> statement-breakpoint
CREATE INDEX "api_categories_enabled_sort_idx" ON "api_categories" USING btree ("is_enabled","sort_order");--> statement-breakpoint
CREATE INDEX "api_daily_quota_usage_date_idx" ON "api_daily_quota_usage" USING btree ("usage_date");--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "apis_version_code_uq" ON "apis" USING btree ("path_version","code");--> statement-breakpoint
CREATE INDEX "apis_category_idx" ON "apis" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "apis_path_version_enabled_idx" ON "apis" USING btree ("path_version","is_enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "pending_charges_api_call_uq" ON "pending_charges" USING btree ("api_call_id");--> statement-breakpoint
CREATE INDEX "pending_charges_status_next_attempt_idx" ON "pending_charges" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "pending_charges_user_idx" ON "pending_charges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "announcements_enabled_pin_sort_idx" ON "announcements" USING btree ("is_enabled","is_pinned","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_msg_user_uq" ON "notification_deliveries" USING btree ("message_id","recipient_user_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_user_created_idx" ON "notification_deliveries" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_deliveries_user_unread_idx" ON "notification_deliveries" USING btree ("recipient_user_id","is_read");--> statement-breakpoint
CREATE INDEX "notification_messages_audience_idx" ON "notification_messages" USING btree ("audience");--> statement-breakpoint
CREATE INDEX "notification_messages_created_at_idx" ON "notification_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "operation_logs_created_at_idx" ON "operation_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "operation_logs_user_created_idx" ON "operation_logs" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "operation_logs_user_action_created_idx" ON "operation_logs" USING btree ("user_id","action","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "operation_logs_action_idx" ON "operation_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "operation_logs_resource_idx" ON "operation_logs" USING btree ("resource_type","resource_id");