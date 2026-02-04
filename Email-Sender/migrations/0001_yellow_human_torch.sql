CREATE TABLE "email_drafts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"footer" text,
	"is_default" boolean DEFAULT false,
	"created_at" text DEFAULT '2026-01-31T21:39:00.980Z',
	"updated_at" text DEFAULT '2026-01-31T21:39:00.981Z'
);
--> statement-breakpoint
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;