import {
  vector,
  serial,
  bigserial,
  varchar,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  jsonb,
  date,
} from "drizzle-orm/pg-core";
import { Metadata } from "../../apps/backend/src/types";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    uuid: varchar("uuid", { length: 36 }).notNull().unique(),
    email: text("email").notNull().unique(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    emailVerified: boolean("email_verified").notNull().default(false),
    profilePictureUrl: text("profile_picture_url"),
    telegramId: varchar("telegram_id", { length: 255 }),
    hasOnboarded: integer("has_onboarded").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),

    lastApiKeyGeneratedAt: timestamp("last_api_key_generated_at").defaultNow(),
    // totalMemories: integer("total_memories").notNull().default(0), // TODO: add this
    stripeCustomerId: text("stripe_customer_id"),

    tier: text("tier", { enum: ["free", "premium"] })
      .notNull()
      .default("free"),
  },
  (users) => ({
    usersIdIdx: uniqueIndex("users_id_idx").on(users.id),
    usersUuidIdx: uniqueIndex("users_uuid_idx").on(users.uuid),
    usersEmailIdx: uniqueIndex("users_email_idx").on(users.email),
    usersNameIdx: index("users_name_idx").on(users.firstName, users.lastName),
    usersCreatedAtIdx: index("users_created_at_idx").on(users.createdAt),
    usersTelegramIdIdx: uniqueIndex("users_telegram_id_idx").on(
      users.telegramId
    ),
  })
);

export const spaces = pgTable(
  "spaces",
  {
    id: bigserial("id", { mode: "number" }).notNull().primaryKey(),
    uuid: varchar("uuid", { length: 36 }).notNull().unique(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ownerId: integer("ownerId").notNull(),
    isPublic: boolean("is_public").notNull().default(false),
  },
  (spaces) => ({
    spacesIdIdx: uniqueIndex("spaces_id_idx").on(spaces.id),
    spacesOwnerIdIdx: index("spaces_owner_id_idx").on(spaces.ownerId),
    spacesNameIdx: index("spaces_name_idx").on(spaces.name),
  })
);

export const contentToSpace = pgTable(
  "content_to_space",
  {
    contentId: integer("content_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    spaceId: integer("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
  },
  (contentToSpace) => ({
    contentIdSpaceIdUnique: uniqueIndex("content_id_space_id_unique").on(
      contentToSpace.contentId,
      contentToSpace.spaceId
    ),
  })
);

export const spaceMembers = pgTable(
  "space_members",
  {
    spaceId: integer("spaceId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
  },
  (spaceMembers) => ({
    spaceMembersSpaceUserIdx: uniqueIndex("space_members_space_user_idx").on(
      spaceMembers.spaceId,
      spaceMembers.userId
    ),
  })
);

export const savedSpaces = pgTable(
  "saved_spaces",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    spaceId: integer("space_id")
      .notNull()
      .references(() => spaces.id, { onDelete: "cascade" }),
    savedAt: timestamp("saved_at").notNull().defaultNow(),
  },
  (savedSpaces) => ({
    savedSpacesUserSpaceIdx: uniqueIndex("saved_spaces_user_space_idx").on(
      savedSpaces.userId,
      savedSpaces.spaceId
    ),
  })
);

export const chatThreads = pgTable(
  "chat_threads",
  {
    id: bigserial("id", { mode: "number" }).notNull().primaryKey(),
    uuid: varchar("uuid", { length: 36 }).notNull().unique(),
    firstMessage: text("firstMessage").notNull(), // can also be re-written by ai depending on the conversation!
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    messages: jsonb("messages").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (thread) => ({
    chatThreadsUserIdx: index("chat_threads_user_idx").on(thread.userId),
  })
);

export const documentType = pgTable("document_type", {
  type: text("type").primaryKey(),
});

export const documents = pgTable(
  "documents",
  {
    id: bigserial("id", { mode: "number" }).notNull().primaryKey(),
    uuid: varchar("uuid", { length: 36 }).notNull().unique(),
    url: text("url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
    type: text("type")
      .references(() => documentType.type)
      .notNull(),
    title: text("title"),
    description: text("description"),
    ogImage: text("og_image"),
    raw: text("raw"),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content"),
    isSuccessfullyProcessed: boolean("is_successfully_processed").default(
      false
    ),
    errorMessage: text("error_message"),
    contentHash: text("content_hash"),
  },
  (document) => ({
    documentsIdIdx: uniqueIndex("document_id_idx").on(document.id),
    documentsUuidIdx: uniqueIndex("document_uuid_idx").on(document.uuid),
    documentsTypdIdx: index("document_type_idx").on(document.type),
    documentRawUserIdx: uniqueIndex("document_raw_user_idx").on(
      document.raw,
      document.userId
    ),
  })
);

export const spaceAccessStatus = pgTable("space_access_status", {
  status: text("status").primaryKey(),
});

export const spaceAccess = pgTable(
  "space_access",
  {
    spaceId: integer("space_id").references(() => spaces.id, {
      onDelete: "cascade",
    }),
    userEmail: varchar("user_email", { length: 512 }),
    status: text("status").references(() => spaceAccessStatus.status),
    accessType: text("access_type").notNull().default("read"), // 'read' or 'edit'
  },
  (spaceAccess) => ({
    spaceIdUserEmailIdx: uniqueIndex("space_id_user_email_idx").on(
      spaceAccess.spaceId,
      spaceAccess.userEmail
    ),
  })
);

export const chunk = pgTable(
  "chunks",
  {
    id: serial("id").primaryKey(),
    documentId: integer("document_id")
      .references(() => documents.id, { onDelete: "cascade" })
      .notNull(),
    textContent: text("text_content"),
    orderInDocument: integer("order_in_document").notNull(),
    embeddings: vector("embeddings", { dimensions: 1536 }),
    metadata: jsonb("metadata").$type<Metadata>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(), // handle deletion on application layer
  },
  (chunk) => ({
    chunkIdIdx: uniqueIndex("chunk_id_idx").on(chunk.id),
    chunkDocumentIdIdx: index("chunk_document_id_idx").on(chunk.documentId),
    embeddingIndex: index("embeddingIndex").using(
      "hnsw",
      chunk.embeddings.op("vector_cosine_ops")
    ),
  })
);

export const jobs = pgTable(
  "job",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }), //why restrict the jobs?? srrsly give me a reason
    url: text("url").notNull(),
    status: text("status").notNull(),
    attempts: integer("attempts").notNull().default(0),
    lastAttemptAt: timestamp("lastAttemptAt", { withTimezone: true }),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (jobs) => ({
    userUniqueJobsIdx: uniqueIndex("user_id_url_idx").on(jobs.userId, jobs.url),
  })
);

export const waitlist = pgTable("waitlist", {
  email: varchar("email", { length: 512 }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Space = typeof spaces.$inferSelect;
export type SpaceMember = typeof spaceMembers.$inferSelect;
export type SavedSpace = typeof savedSpaces.$inferSelect;
export type ChatThread = typeof chatThreads.$inferSelect;
export type Chunk = typeof chunk.$inferSelect;
export type ChunkInsert = typeof chunk.$inferInsert;
export type DocumentType = typeof documentType.$inferSelect;
export type ContentToSpace = typeof contentToSpace.$inferSelect;
export type Job = typeof jobs.$inferInsert;
