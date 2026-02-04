ALTER TABLE "email_drafts" ADD COLUMN "sender_name" text DEFAULT 'Bulk Sender';
ALTER TABLE "email_drafts" ADD COLUMN "logo_attachment_id" integer;
ALTER TABLE "email_drafts" ADD COLUMN "recipient_ids" jsonb DEFAULT '[]'::jsonb;
ALTER TABLE "email_drafts" ADD COLUMN "attachment_ids" jsonb DEFAULT '[]'::jsonb;