CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_id" varchar(36),
	"recipient_user_id" integer NOT NULL,
	"sender_user_id" integer,
	"sender_actor" varchar(140),
	"title" varchar(200) NOT NULL,
	"content" text NOT NULL,
	"level" varchar(20) DEFAULT 'info' NOT NULL,
	"link_url" varchar(1000),
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "announcement_show_on_home" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_recipient_created_idx" ON "notifications" USING btree ("recipient_user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_recipient_unread_idx" ON "notifications" USING btree ("recipient_user_id","is_read");--> statement-breakpoint
CREATE INDEX "notifications_batch_idx" ON "notifications" USING btree ("batch_id");