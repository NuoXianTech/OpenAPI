CREATE TABLE "credit_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
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
ALTER TABLE "api_calls" ADD COLUMN "credits_cost" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_transactions_user_created_idx" ON "credit_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_transactions_reason_idx" ON "credit_transactions" USING btree ("reason");--> statement-breakpoint
CREATE INDEX "credit_transactions_api_call_idx" ON "credit_transactions" USING btree ("api_call_id");