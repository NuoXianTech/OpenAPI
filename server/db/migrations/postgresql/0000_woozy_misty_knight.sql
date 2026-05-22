CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"level" varchar(20) DEFAULT 'info' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"start_at" timestamp with time zone,
	"end_at" timestamp with time zone,
	"link_url" varchar(1000),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_call_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_id" integer NOT NULL,
	"stat_date" timestamp with time zone NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" uuid DEFAULT gen_random_uuid(),
	"api_id" integer NOT NULL,
	"api_key_id" integer,
	"user_id" integer,
	"path" varchar(1000) NOT NULL,
	"method" varchar(10) NOT NULL,
	"query_string" varchar(2000),
	"status_code" integer NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"ip" varchar(45),
	"country" varchar(2),
	"region" varchar(100),
	"city" varchar(100),
	"user_agent" varchar(500),
	"referer" varchar(1000),
	"request_size" integer,
	"response_size" integer,
	"error_code" varchar(50),
	"error_message" varchar(500),
	"credits_cost" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"api_key" varchar(120) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"scopes" jsonb,
	"ip_whitelist" jsonb,
	"total_quota" bigint,
	"used_credits" bigint DEFAULT 0 NOT NULL,
	"total_calls" bigint DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"last_used_ip" varchar(45),
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "api_rate_limit_buckets" (
	"id" serial PRIMARY KEY NOT NULL,
	"bucket_key" varchar(200) NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apis" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"path_version" varchar(8) DEFAULT 'v1' NOT NULL,
	"endpoint_count" integer DEFAULT 0 NOT NULL,
	"name" varchar(100) NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"category_id" integer,
	"short_desc" varchar(30) NOT NULL,
	"description" text NOT NULL,
	"http_method" varchar(50) NOT NULL,
	"api_path" varchar(200) NOT NULL,
	"doc_url" varchar(200) NOT NULL,
	"doc_version" varchar(32) DEFAULT 'v1' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_api_key" boolean DEFAULT false NOT NULL,
	"is_statistics" boolean DEFAULT true NOT NULL,
	"rate_limit_per_second" integer DEFAULT 0 NOT NULL,
	"rate_limit_per_minute" integer DEFAULT 0 NOT NULL,
	"rate_limit_per_hour" integer DEFAULT 0 NOT NULL,
	"rate_limit_per_day" integer DEFAULT 0 NOT NULL,
	"method_costs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"daily_quota" integer DEFAULT 0 NOT NULL,
	"timeout_ms" integer DEFAULT 10000 NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"amount" integer NOT NULL,
	"balance_after" bigint NOT NULL,
	"reason" varchar(50) NOT NULL,
	"api_id" integer,
	"api_call_id" integer,
	"operator_id" integer,
	"operator_name" varchar(140),
	"remark" varchar(500),
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
	"id" serial PRIMARY KEY NOT NULL,
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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
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
CREATE TABLE "oauth_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(32) NOT NULL,
	"client_id" varchar(255) DEFAULT '' NOT NULL,
	"client_secret" varchar(1000) DEFAULT '' NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"actor" varchar(140),
	"action" varchar(80) NOT NULL,
	"resource_type" varchar(80),
	"resource_id" varchar(120),
	"ip" varchar(45),
	"user_agent" varchar(500),
	"detail" jsonb,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_charges" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_call_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"api_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"remark" varchar(500),
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" varchar(500),
	"last_attempt_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_expires_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redemption_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(64) NOT NULL,
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
	CONSTRAINT "redemption_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "redemption_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"code_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"transaction_id" integer,
	"ip" varchar(45),
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_id" varchar(128) PRIMARY KEY NOT NULL,
	"kind" varchar(20) DEFAULT 'user' NOT NULL,
	"user_id" integer,
	"ip" varchar(45),
	"user_agent" varchar(500),
	"is_remembered" boolean DEFAULT false NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" varchar(32) DEFAULT 'default' NOT NULL,
	"site_url" varchar(1000) DEFAULT 'http://localhost:3000' NOT NULL,
	"site_img" varchar(1000) DEFAULT '/favicon.ico' NOT NULL,
	"site_name" varchar(140) DEFAULT 'OpenAPI' NOT NULL,
	"site_description" text DEFAULT 'OpenAPI是免费为用户提供网络数据接口调用的服务平台。' NOT NULL,
	"start_time" varchar(32) DEFAULT '2026-01-01 00:00:00' NOT NULL,
	"registration_mode" varchar(20) DEFAULT 'open' NOT NULL,
	"register_email_filter_mode" varchar(20) DEFAULT 'off' NOT NULL,
	"register_email_filter_list" text DEFAULT '' NOT NULL,
	"session_max_age_seconds" integer DEFAULT 86400 NOT NULL,
	"session_absolute_max_age_seconds" integer DEFAULT 604800 NOT NULL,
	"session_remember_max_age_seconds" integer DEFAULT 2592000 NOT NULL,
	"email_verify_expires_in_minutes" integer DEFAULT 30 NOT NULL,
	"password_reset_expires_in_minutes" integer DEFAULT 30 NOT NULL,
	"password_reset_enabled" boolean DEFAULT true NOT NULL,
	"icp_beian" varchar(100),
	"police_beian" varchar(100),
	"terms_url" varchar(1000),
	"privacy_url" varchar(1000),
	"smtp_host" varchar(255) DEFAULT 'smtp.example.com' NOT NULL,
	"smtp_port" integer DEFAULT 465 NOT NULL,
	"smtp_secure" boolean DEFAULT true NOT NULL,
	"smtp_user" varchar(255) DEFAULT '' NOT NULL,
	"smtp_pass" varchar(255) DEFAULT '' NOT NULL,
	"smtp_from" varchar(255) DEFAULT 'no-reply@example.com' NOT NULL,
	"oauth_login_enabled" boolean DEFAULT true NOT NULL,
	"oauth_force_binding" boolean DEFAULT false NOT NULL,
	"turnstile_enabled" boolean DEFAULT false NOT NULL,
	"turnstile_site_key" varchar(200) DEFAULT '' NOT NULL,
	"turnstile_secret_key" varchar(500) DEFAULT '' NOT NULL,
	"turnstile_login_enabled" boolean DEFAULT true NOT NULL,
	"turnstile_register_enabled" boolean DEFAULT true NOT NULL,
	"turnstile_admin_login_enabled" boolean DEFAULT false NOT NULL,
	"turnstile_password_reset_enabled" boolean DEFAULT true NOT NULL,
	"announcement_show_on_home" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_scope_unique" UNIQUE("scope")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"display_name" varchar(100),
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"credits" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"banned_reason" varchar(500),
	"banned_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"last_login_ip" varchar(45),
	"last_login_user_agent" varchar(500),
	"email_verified_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"purpose" varchar(20) DEFAULT 'verify' NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"ip" varchar(45),
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_call_stats" ADD CONSTRAINT "api_call_stats_api_id_apis_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."apis"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_calls" ADD CONSTRAINT "api_calls_api_id_apis_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."apis"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_calls" ADD CONSTRAINT "api_calls_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_calls" ADD CONSTRAINT "api_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apis" ADD CONSTRAINT "apis_category_id_api_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."api_categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apis" ADD CONSTRAINT "apis_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apis" ADD CONSTRAINT "apis_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_links" ADD CONSTRAINT "friend_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_message_id_notification_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."notification_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_messages" ADD CONSTRAINT "notification_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_charges" ADD CONSTRAINT "pending_charges_api_call_id_api_calls_id_fk" FOREIGN KEY ("api_call_id") REFERENCES "public"."api_calls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_charges" ADD CONSTRAINT "pending_charges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_charges" ADD CONSTRAINT "pending_charges_api_id_apis_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."apis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_records" ADD CONSTRAINT "redemption_records_code_id_redemption_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."redemption_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_records" ADD CONSTRAINT "redemption_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcements_enabled_pin_sort_idx" ON "announcements" USING btree ("is_enabled","is_pinned","sort_order");--> statement-breakpoint
CREATE INDEX "announcements_window_idx" ON "announcements" USING btree ("start_at","end_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_call_stats_api_id_stat_date_uq" ON "api_call_stats" USING btree ("api_id","stat_date");--> statement-breakpoint
CREATE INDEX "api_call_stats_stat_date_idx" ON "api_call_stats" USING btree ("stat_date");--> statement-breakpoint
CREATE INDEX "api_calls_created_at_idx" ON "api_calls" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_calls_api_id_created_at_idx" ON "api_calls" USING btree ("api_id","created_at");--> statement-breakpoint
CREATE INDEX "api_calls_user_created_at_idx" ON "api_calls" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "api_calls_api_key_created_at_idx" ON "api_calls" USING btree ("api_key_id","created_at");--> statement-breakpoint
CREATE INDEX "api_calls_status_idx" ON "api_calls" USING btree ("status_code");--> statement-breakpoint
CREATE INDEX "api_calls_request_id_idx" ON "api_calls" USING btree ("request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_categories_code_uq" ON "api_categories" USING btree ("code");--> statement-breakpoint
CREATE INDEX "api_categories_parent_sort_idx" ON "api_categories" USING btree ("parent_id","sort_order");--> statement-breakpoint
CREATE INDEX "api_categories_enabled_sort_idx" ON "api_categories" USING btree ("is_enabled","sort_order");--> statement-breakpoint
CREATE INDEX "api_keys_user_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_keys_active_idx" ON "api_keys" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "api_keys_expires_idx" ON "api_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "api_rate_limit_buckets_key_window_uq" ON "api_rate_limit_buckets" USING btree ("bucket_key","window_start");--> statement-breakpoint
CREATE INDEX "api_rate_limit_buckets_window_idx" ON "api_rate_limit_buckets" USING btree ("window_start");--> statement-breakpoint
CREATE UNIQUE INDEX "apis_version_code_uq" ON "apis" USING btree ("path_version","code");--> statement-breakpoint
CREATE INDEX "apis_category_idx" ON "apis" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "apis_enabled_idx" ON "apis" USING btree ("is_enabled");--> statement-breakpoint
CREATE INDEX "apis_status_idx" ON "apis" USING btree ("status");--> statement-breakpoint
CREATE INDEX "apis_path_version_enabled_idx" ON "apis" USING btree ("path_version","is_enabled");--> statement-breakpoint
CREATE INDEX "credit_transactions_user_created_idx" ON "credit_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_transactions_reason_idx" ON "credit_transactions" USING btree ("reason");--> statement-breakpoint
CREATE INDEX "credit_transactions_api_call_idx" ON "credit_transactions" USING btree ("api_call_id");--> statement-breakpoint
CREATE UNIQUE INDEX "credit_transactions_api_call_reason_uq" ON "credit_transactions" USING btree ("api_call_id","reason") WHERE "credit_transactions"."api_call_id" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "friend_links_active_idx" ON "friend_links" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_msg_user_uq" ON "notification_deliveries" USING btree ("message_id","recipient_user_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_user_created_idx" ON "notification_deliveries" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_deliveries_user_unread_idx" ON "notification_deliveries" USING btree ("recipient_user_id","is_read");--> statement-breakpoint
CREATE INDEX "notification_messages_audience_idx" ON "notification_messages" USING btree ("audience");--> statement-breakpoint
CREATE INDEX "notification_messages_created_at_idx" ON "notification_messages" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_accounts_provider_pid_uq" ON "oauth_accounts" USING btree ("provider","provider_user_id");--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_idx" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_accounts_provider_idx" ON "oauth_accounts" USING btree ("provider");--> statement-breakpoint
CREATE UNIQUE INDEX "oauth_providers_provider_uq" ON "oauth_providers" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "operation_logs_created_at_idx" ON "operation_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "operation_logs_user_created_idx" ON "operation_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "operation_logs_action_idx" ON "operation_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "operation_logs_resource_idx" ON "operation_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pending_charges_api_call_uq" ON "pending_charges" USING btree ("api_call_id");--> statement-breakpoint
CREATE INDEX "pending_charges_status_next_attempt_idx" ON "pending_charges" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "pending_charges_lease_idx" ON "pending_charges" USING btree ("status","lease_expires_at");--> statement-breakpoint
CREATE INDEX "pending_charges_user_idx" ON "pending_charges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "redemption_codes_batch_idx" ON "redemption_codes" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "redemption_codes_enabled_expires_idx" ON "redemption_codes" USING btree ("is_enabled","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "redemption_records_code_user_uq" ON "redemption_records" USING btree ("code_id","user_id");--> statement-breakpoint
CREATE INDEX "redemption_records_user_redeemed_idx" ON "redemption_records" USING btree ("user_id","redeemed_at");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_last_active_idx" ON "sessions" USING btree ("last_active_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_uq" ON "users" USING btree ("username") WHERE "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" USING btree (lower("email")) WHERE "users"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "users_active_banned_idx" ON "users" USING btree ("is_active","is_banned");--> statement-breakpoint
CREATE INDEX "verification_tokens_user_created_idx" ON "verification_tokens" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "verification_tokens_email_idx" ON "verification_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "verification_tokens_purpose_idx" ON "verification_tokens" USING btree ("purpose");--> statement-breakpoint
CREATE INDEX "verification_tokens_expires_idx" ON "verification_tokens" USING btree ("expires_at");