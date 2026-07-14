ALTER TABLE "apis" ADD COLUMN "capability_config" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "apis" ADD COLUMN "capability_revision" integer DEFAULT 0 NOT NULL;
