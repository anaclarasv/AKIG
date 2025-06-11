ALTER TABLE "monitoring_sessions" ADD COLUMN "archived_at" timestamp;--> statement-breakpoint
ALTER TABLE "monitoring_sessions" ADD COLUMN "archived_by" varchar;--> statement-breakpoint
ALTER TABLE "monitoring_sessions" ADD COLUMN "archive_reason" text;--> statement-breakpoint
ALTER TABLE "monitoring_sessions" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "monitoring_sessions" ADD COLUMN "deleted_by" varchar;--> statement-breakpoint
ALTER TABLE "monitoring_sessions" ADD COLUMN "delete_reason" text;--> statement-breakpoint
ALTER TABLE "monitoring_sessions" ADD CONSTRAINT "monitoring_sessions_archived_by_users_id_fk" FOREIGN KEY ("archived_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_sessions" ADD CONSTRAINT "monitoring_sessions_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;