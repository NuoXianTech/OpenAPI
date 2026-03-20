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
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"category" varchar(100),
	"short_desc" varchar(30) NOT NULL,
	"description" text NOT NULL,
	"version" varchar(50) DEFAULT '1.0.0' NOT NULL,
	"tags" varchar(255),
	"auth_type" varchar(50) DEFAULT 'none' NOT NULL,
	"request_schema" text,
	"response_schema" text,
	"request_example" text,
	"response_example" text,
	"http_method" varchar(10) NOT NULL,
	"api_path" varchar(200) NOT NULL,
	"doc_url" varchar(200) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_api_key" boolean DEFAULT false NOT NULL,
	"is_statistics" boolean DEFAULT true NOT NULL,
	"rate_limit_per_minute" integer DEFAULT 0 NOT NULL,
	"total_calls" integer DEFAULT 0 NOT NULL,
	"success_calls" integer DEFAULT 0 NOT NULL,
	"failure_calls" integer DEFAULT 0 NOT NULL,
	"last_called_at" timestamp with time zone,
	"created_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_lists_code_unique" UNIQUE("code")
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
CREATE TABLE "operation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"actor" varchar(100),
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100),
	"resource_id" varchar(128),
	"ip" varchar(45),
	"user_agent" varchar(512),
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" varchar(128) NOT NULL,
	"user_id" integer,
	"role" varchar(20) NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"display_name" varchar(100),
	"avatar_url" varchar(255),
	"role" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_banned" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_ip" varchar(45) NOT NULL,
	"email_verified_at" timestamp with time zone,
	"api_key" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
ALTER TABLE "api_calls" ADD CONSTRAINT "api_calls_api_id_api_lists_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."api_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_calls" ADD CONSTRAINT "api_calls_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_calls" ADD CONSTRAINT "api_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_lists" ADD CONSTRAINT "api_lists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_lists" ADD CONSTRAINT "api_lists_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friend_links" ADD CONSTRAINT "friend_links_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;