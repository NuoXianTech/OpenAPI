DROP INDEX "oauth_providers_enabled_sort_idx";--> statement-breakpoint
ALTER TABLE "oauth_providers" ALTER COLUMN "client_id" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "oauth_providers" ALTER COLUMN "client_secret" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "oauth_providers" DROP COLUMN "display_name";--> statement-breakpoint
ALTER TABLE "oauth_providers" DROP COLUMN "icon";--> statement-breakpoint
ALTER TABLE "oauth_providers" DROP COLUMN "scopes";--> statement-breakpoint
ALTER TABLE "oauth_providers" DROP COLUMN "callback_url";--> statement-breakpoint
ALTER TABLE "oauth_providers" DROP COLUMN "authorize_url";--> statement-breakpoint
ALTER TABLE "oauth_providers" DROP COLUMN "token_url";--> statement-breakpoint
ALTER TABLE "oauth_providers" DROP COLUMN "user_info_url";--> statement-breakpoint
ALTER TABLE "oauth_providers" DROP COLUMN "extra_config";--> statement-breakpoint
ALTER TABLE "oauth_providers" DROP COLUMN "sort_order";--> statement-breakpoint
ALTER TABLE "oauth_providers" DROP COLUMN "description";