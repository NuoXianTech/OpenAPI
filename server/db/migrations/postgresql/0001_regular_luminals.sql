ALTER TABLE "api_calls" RENAME COLUMN "target_name" TO "route_name";--> statement-breakpoint
ALTER TABLE "routing_revisions" DROP CONSTRAINT "routing_revisions_status_chk";--> statement-breakpoint
DROP INDEX "routing_revisions_environment_published_uq";--> statement-breakpoint
DELETE FROM "routing_revisions" WHERE "status" in ('building', 'failed');--> statement-breakpoint
UPDATE "routing_revisions"
SET "published_at" = "created_at"
WHERE "published_at" is null;--> statement-breakpoint
ALTER TABLE "routing_revisions" ALTER COLUMN "published_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_messages" ADD COLUMN "recipient_cutoff_user_id" integer;--> statement-breakpoint
UPDATE "notification_messages" AS "message"
SET "recipient_cutoff_user_id" = coalesce((
  SELECT max("delivery"."recipient_user_id")
  FROM "notification_deliveries" AS "delivery"
  WHERE "delivery"."message_id" = "message"."id"
), 0)
WHERE "message"."audience" = 'all_current';--> statement-breakpoint
ALTER TABLE "routing_revisions" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "routing_revisions" DROP COLUMN "failure_reason";--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_credits_chk" CHECK ("users"."credits" >= 0);--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_token_version_chk" CHECK ("users"."token_version" >= 0);--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_read_state_chk" CHECK ((
    "notification_deliveries"."is_read" = true and "notification_deliveries"."read_at" is not null
  ) or (
    "notification_deliveries"."is_read" = false and "notification_deliveries"."read_at" is null
  ));--> statement-breakpoint
ALTER TABLE "notification_messages" ADD CONSTRAINT "notification_messages_recipient_cutoff_chk" CHECK ((
    "notification_messages"."audience" = 'all_current' and "notification_messages"."recipient_cutoff_user_id" >= 0
  ) or (
    "notification_messages"."audience" <> 'all_current' and "notification_messages"."recipient_cutoff_user_id" is null
  ));
