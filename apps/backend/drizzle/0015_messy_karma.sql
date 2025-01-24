CREATE TABLE IF NOT EXISTS "processed_content" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_hash" text NOT NULL,
	"content" text NOT NULL,
	"is_successfully_processed" boolean DEFAULT false,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "processed_content_content_hash_unique" UNIQUE("content_hash")
);
--> statement-breakpoint
ALTER TABLE "chunks" ALTER COLUMN "text_content" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "content_hash" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "processed_content_hash_idx" ON "processed_content" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chunk_content_hash_idx" ON "chunks" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_content_hash_idx" ON "documents" USING btree ("content_hash");