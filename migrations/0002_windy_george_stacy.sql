CREATE TABLE "evaluation_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"evaluation_id" integer NOT NULL,
	"criteria_id" integer NOT NULL,
	"response" varchar NOT NULL,
	"points_earned" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "form_criteria" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"weight" numeric(5, 2) NOT NULL,
	"type" varchar NOT NULL,
	"is_required" boolean DEFAULT true,
	"is_critical_failure" boolean DEFAULT false,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "form_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "monitoring_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"monitoring_session_id" integer NOT NULL,
	"form_id" integer NOT NULL,
	"evaluator_id" varchar NOT NULL,
	"partial_score" numeric(5, 2) NOT NULL,
	"final_score" numeric(5, 2) NOT NULL,
	"has_critical_failure" boolean DEFAULT false,
	"critical_failure_reason" text,
	"observations" text,
	"status" varchar DEFAULT 'draft' NOT NULL,
	"agent_signature" varchar,
	"agent_signed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "monitoring_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"company_id" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "evaluation_responses" ADD CONSTRAINT "evaluation_responses_evaluation_id_monitoring_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."monitoring_evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_responses" ADD CONSTRAINT "evaluation_responses_criteria_id_form_criteria_id_fk" FOREIGN KEY ("criteria_id") REFERENCES "public"."form_criteria"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_criteria" ADD CONSTRAINT "form_criteria_section_id_form_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."form_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_sections" ADD CONSTRAINT "form_sections_form_id_monitoring_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."monitoring_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_evaluations" ADD CONSTRAINT "monitoring_evaluations_monitoring_session_id_monitoring_sessions_id_fk" FOREIGN KEY ("monitoring_session_id") REFERENCES "public"."monitoring_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_evaluations" ADD CONSTRAINT "monitoring_evaluations_form_id_monitoring_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."monitoring_forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_evaluations" ADD CONSTRAINT "monitoring_evaluations_evaluator_id_users_id_fk" FOREIGN KEY ("evaluator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_forms" ADD CONSTRAINT "monitoring_forms_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;