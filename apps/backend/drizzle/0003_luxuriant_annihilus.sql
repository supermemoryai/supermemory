ALTER TABLE "documents" ALTER COLUMN "is_successfully_processed" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "space_access" ADD COLUMN "access_type" text DEFAULT 'read' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "document_raw_user_idx" ON "documents" USING btree ("raw","user_id");--> statement-breakpoint