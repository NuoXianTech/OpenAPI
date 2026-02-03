CREATE TABLE "test_api" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"docurl" text NOT NULL,
	"url" text NOT NULL,
	"method" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"status" integer DEFAULT 1 NOT NULL
);
