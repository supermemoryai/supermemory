ALTER TABLE "chunks" ALTER COLUMN "embeddings" SET DATA TYPE vector(768);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "documents_search_idx" ON "documents" USING gin ((
        setweight(to_tsvector('english', coalesce("content", '')),'A') ||
        setweight(to_tsvector('english', coalesce("title", '')),'B') ||
        setweight(to_tsvector('english', coalesce("description", '')),'C') ||
        setweight(to_tsvector('english', coalesce("url", '')),'D')
      ));