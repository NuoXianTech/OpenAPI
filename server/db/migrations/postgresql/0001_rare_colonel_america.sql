CREATE UNIQUE INDEX "api_call_stats_api_id_stat_date_uq" ON "api_call_stats" USING btree ("api_id","stat_date");--> statement-breakpoint
CREATE INDEX "api_call_stats_stat_date_idx" ON "api_call_stats" USING btree ("stat_date");--> statement-breakpoint
CREATE INDEX "api_calls_created_at_idx" ON "api_calls" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "api_calls_api_id_created_at_idx" ON "api_calls" USING btree ("api_id","created_at");