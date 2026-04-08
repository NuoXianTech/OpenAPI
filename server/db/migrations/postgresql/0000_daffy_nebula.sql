CREATE TABLE "api_call_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_id" integer NOT NULL,
	"api_call_id" integer,
	"stat_date" timestamp with time zone NOT NULL,
	"total_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"api_path" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_id" integer NOT NULL,
	"api_key_id" integer,
	"user_id" integer,
	"path" varchar(1000) NOT NULL,
	"method" varchar(10) NOT NULL,
	"status_code" integer NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"ip" varchar(45),
	"request_size" integer,
	"response_size" integer,
	"raw_request" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"api_key" varchar(120) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_keys_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "api_lists" (
	"id" serial NOT NULL,
	"code" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"category" varchar(100),
	"short_desc" varchar(30) NOT NULL,
	"description" text NOT NULL,
	"http_method" varchar(50) NOT NULL,
	"api_path" varchar(200) NOT NULL,
	"doc_url" varchar(200) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_api_key" boolean DEFAULT false NOT NULL,
	"is_statistics" boolean DEFAULT true NOT NULL,
	"rate_limit_per_minute" integer DEFAULT 0 NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_lists_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "email_verification_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_verification_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "fab_menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(140) NOT NULL,
	"subtitle" varchar(240),
	"icon" varchar(120) DEFAULT 'mdi:link-variant' NOT NULL,
	"action_type" varchar(20) DEFAULT 'link' NOT NULL,
	"action_value" varchar(1000) NOT NULL,
	"action_label" varchar(60) DEFAULT '打开' NOT NULL,
	"target" varchar(20) DEFAULT '_blank' NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "friend_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(140) NOT NULL,
	"url" varchar(1000) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_id" varchar(128) PRIMARY KEY NOT NULL,
	"kind" varchar(20) DEFAULT 'user' NOT NULL,
	"user_id" integer,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope" varchar(32) DEFAULT 'default' NOT NULL,
	"site_url" varchar(1000) DEFAULT 'http://localhost:3000' NOT NULL,
	"site_img" varchar(1000) DEFAULT 'https://q1.qlogo.cn/g?b=qq&nk=1428309052&s=640' NOT NULL,
	"site_name" varchar(140) DEFAULT 'OpenAPI' NOT NULL,
	"site_description" text DEFAULT 'OpenAPI是免费为用户提供网络数据接口调用的服务平台。' NOT NULL,
	"start_time" varchar(32) DEFAULT '2026-01-01 00:00:00' NOT NULL,
	"session_max_age_seconds" integer DEFAULT 604800 NOT NULL,
	"email_verify_expires_in_minutes" integer DEFAULT 30 NOT NULL,
	"smtp_host" varchar(255) DEFAULT 'smtp.example.com' NOT NULL,
	"smtp_port" integer DEFAULT 465 NOT NULL,
	"smtp_secure" boolean DEFAULT true NOT NULL,
	"smtp_user" varchar(255) DEFAULT '' NOT NULL,
	"smtp_pass" varchar(255) DEFAULT '' NOT NULL,
	"smtp_from" varchar(255) DEFAULT 'no-reply@example.com' NOT NULL,
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
	"avatar_url" varchar(255),
	"is_active" boolean DEFAULT false NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone,
	"last_login_ip" varchar(45),
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "api_call_stats" ADD CONSTRAINT "api_call_stats_api_id_api_lists_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."api_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_call_stats" ADD CONSTRAINT "api_call_stats_api_call_id_api_calls_id_fk" FOREIGN KEY ("api_call_id") REFERENCES "public"."api_calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_calls" ADD CONSTRAINT "api_calls_api_id_api_lists_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."api_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_calls" ADD CONSTRAINT "api_calls_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_calls" ADD CONSTRAINT "api_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_lists" ADD CONSTRAINT "api_lists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_lists" ADD CONSTRAINT "api_lists_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fab_menu_items" ADD CONSTRAINT "fab_menu_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fab_menu_items" ADD CONSTRAINT "fab_menu_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_links" ADD CONSTRAINT "friend_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_call_stats_api_id_stat_date_uq" ON "api_call_stats" USING btree ("api_id","stat_date");--> statement-breakpoint
CREATE INDEX "api_call_stats_stat_date_idx" ON "api_call_stats" USING btree ("stat_date");--> statement-breakpoint
CREATE INDEX "api_calls_created_at_idx" ON "api_calls" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_calls_api_id_created_at_idx" ON "api_calls" USING btree ("api_id","created_at");