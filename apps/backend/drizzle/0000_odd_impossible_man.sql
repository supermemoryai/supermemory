CREATE EXTENSION IF NOT EXISTS vectorscale CASCADE;

CREATE TABLE IF NOT EXISTS "chat_threads" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" varchar(36) NOT NULL,
	"firstMessage" text NOT NULL,
	"user_id" integer NOT NULL,
	"messages" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_threads_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chunks" (
	"id" serial PRIMARY KEY NOT NULL,
	"document_id" integer NOT NULL,
	"text_content" text,
	"order_in_document" integer NOT NULL,
	"embeddings" vector(1536),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "content_to_space" (
	"content_id" integer NOT NULL,
	"space_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_type" (
	"type" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" varchar(36) NOT NULL,
	"url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"type" text NOT NULL,
	"title" text,
	"description" text,
	"og_image" text,
	"raw" text,
	"user_id" integer NOT NULL,
	"content" text,
	CONSTRAINT "documents_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"url" text NOT NULL,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lastAttemptAt" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "space_access" (
	"space_id" integer,
	"user_email" varchar(512),
	"status" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "space_access_status" (
	"status" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "space_members" (
	"spaceId" integer NOT NULL,
	"user_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spaces" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uuid" varchar(36) NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ownerId" integer NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	CONSTRAINT "spaces_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" varchar(36) NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"email_verified" boolean DEFAULT false NOT NULL,
	"profile_picture_url" text,
	"telegram_id" varchar(255),
	"has_onboarded" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chat_threads" ADD CONSTRAINT "chat_threads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "chunks" ADD CONSTRAINT "chunks_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_to_space" ADD CONSTRAINT "content_to_space_content_id_documents_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "content_to_space" ADD CONSTRAINT "content_to_space_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_type_document_type_type_fk" FOREIGN KEY ("type") REFERENCES "public"."document_type"("type") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job" ADD CONSTRAINT "job_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "space_access" ADD CONSTRAINT "space_access_space_id_spaces_id_fk" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "space_access" ADD CONSTRAINT "space_access_status_space_access_status_status_fk" FOREIGN KEY ("status") REFERENCES "public"."space_access_status"("status") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "space_members" ADD CONSTRAINT "space_members_spaceId_users_id_fk" FOREIGN KEY ("spaceId") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "space_members" ADD CONSTRAINT "space_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chat_threads_user_idx" ON "chat_threads" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chunk_id_idx" ON "chunks" USING btree ("id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "chunk_document_id_idx" ON "chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "embeddingIndex" ON "chunks" USING diskann ("embeddings" vector_cosine_ops);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "content_id_space_id_unique" ON "content_to_space" USING btree ("content_id","space_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "document_id_idx" ON "documents" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "document_uuid_idx" ON "documents" USING btree ("uuid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "document_type_idx" ON "documents" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "document_url_user_id_idx" ON "documents" USING btree ("url","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_id_url_idx" ON "job" USING btree ("user_id","url");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "space_id_user_email_idx" ON "space_access" USING btree ("space_id","user_email");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "space_members_space_user_idx" ON "space_members" USING btree ("spaceId","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "spaces_id_idx" ON "spaces" USING btree ("id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spaces_owner_id_idx" ON "spaces" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "spaces_name_idx" ON "spaces" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_id_idx" ON "users" USING btree ("id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_uuid_idx" ON "users" USING btree ("uuid");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_name_idx" ON "users" USING btree ("first_name","last_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_telegram_id_idx" ON "users" USING btree ("telegram_id");