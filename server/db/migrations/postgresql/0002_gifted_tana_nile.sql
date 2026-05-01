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
ALTER TABLE "redemption_records" ADD CONSTRAINT "redemption_records_code_id_redemption_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."redemption_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_records" ADD CONSTRAINT "redemption_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "redemption_codes_batch_idx" ON "redemption_codes" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "redemption_codes_enabled_expires_idx" ON "redemption_codes" USING btree ("is_enabled","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "redemption_records_code_user_uq" ON "redemption_records" USING btree ("code_id","user_id");--> statement-breakpoint
CREATE INDEX "redemption_records_user_redeemed_idx" ON "redemption_records" USING btree ("user_id","redeemed_at");