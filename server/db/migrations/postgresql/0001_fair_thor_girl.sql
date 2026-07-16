CREATE TABLE "api_daily_quota_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"api_id" integer NOT NULL,
	"usage_date" timestamp with time zone NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "api_daily_quota_usage" ADD CONSTRAINT "api_daily_quota_usage_api_id_apis_id_fk" FOREIGN KEY ("api_id") REFERENCES "public"."apis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "api_daily_quota_usage_api_id_date_uq" ON "api_daily_quota_usage" USING btree ("api_id","usage_date");--> statement-breakpoint
CREATE INDEX "api_daily_quota_usage_date_idx" ON "api_daily_quota_usage" USING btree ("usage_date");