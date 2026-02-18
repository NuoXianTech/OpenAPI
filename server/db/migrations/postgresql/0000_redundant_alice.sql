CREATE TABLE "api_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"status" integer DEFAULT 1 NOT NULL,
	"short_desc" varchar(30) NOT NULL,
	"description" text NOT NULL,
	"http_method" varchar(10) NOT NULL,
	"api_path" varchar(200) NOT NULL,
	"doc_url" varchar(200) NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"is_api_key" boolean DEFAULT false NOT NULL,
	"is_statistics" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"create_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_lists_code_unique" UNIQUE("code")
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
	"api_key" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
ALTER TABLE "api_lists" ADD CONSTRAINT "api_lists_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_lists" ADD CONSTRAINT "api_lists_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;