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
ALTER TABLE "fab_menu_items" ADD CONSTRAINT "fab_menu_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fab_menu_items" ADD CONSTRAINT "fab_menu_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_links" ADD CONSTRAINT "friend_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;