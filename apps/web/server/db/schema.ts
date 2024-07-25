import { create } from "domain";
import { relations, sql } from "drizzle-orm";
import {
	index,
	int,
	primaryKey,
	sqliteTableCreator,
	text,
	integer,
} from "drizzle-orm/sqlite-core";
import type { AdapterAccountType } from "next-auth/adapters";

export const createTable = sqliteTableCreator((name) => `${name}`);

export const users = createTable(
	"user",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		name: text("name"),
		email: text("email").notNull(),
		emailVerified: integer("emailVerified", { mode: "timestamp_ms" }),
		image: text("image"),
		telegramId: text("telegramId"),
		hasOnboarded: integer("hasOnboarded", { mode: "boolean" }).default(false),
	},
	(user) => ({
		emailIdx: index("users_email_idx").on(user.email),
		telegramIdx: index("users_telegram_idx").on(user.telegramId),
		idIdx: index("users_id_idx").on(user.id),
	}),
);

export type User = typeof users.$inferSelect;

export const accounts = createTable(
	"account",
	{
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: text("type").$type<AdapterAccountType>().notNull(),
		provider: text("provider").notNull(),
		providerAccountId: text("providerAccountId").notNull(),
		refresh_token: text("refresh_token"),
		access_token: text("access_token"),
		expires_at: integer("expires_at"),
		token_type: text("token_type"),
		scope: text("scope"),
		id_token: text("id_token"),
		session_state: text("session_state"),
	},
	(account) => ({
		compoundKey: primaryKey({
			columns: [account.provider, account.providerAccountId],
		}),
	}),
);

export const sessions = createTable("session", {
	sessionToken: text("sessionToken").primaryKey(),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
});

export const verificationTokens = createTable(
	"verificationToken",
	{
		identifier: text("identifier").notNull(),
		token: text("token").notNull(),
		expires: integer("expires", { mode: "timestamp_ms" }).notNull(),
	},
	(verificationToken) => ({
		compositePk: primaryKey({
			columns: [verificationToken.identifier, verificationToken.token],
		}),
	}),
);

export const authenticators = createTable(
	"authenticator",
	{
		credentialID: text("credentialID").notNull().unique(),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		providerAccountId: text("providerAccountId").notNull(),
		credentialPublicKey: text("credentialPublicKey").notNull(),
		counter: integer("counter").notNull(),
		credentialDeviceType: text("credentialDeviceType").notNull(),
		credentialBackedUp: integer("credentialBackedUp", {
			mode: "boolean",
		}).notNull(),
		transports: text("transports"),
	},
	(authenticator) => ({
		compositePK: primaryKey({
			columns: [authenticator.userId, authenticator.credentialID],
		}),
	}),
);

export const storedContent = createTable(
	"storedContent",
	{
		id: integer("id").notNull().primaryKey({ autoIncrement: true }),
		content: text("content").notNull(),
		title: text("title", { length: 255 }),
		description: text("description", { length: 255 }),
		url: text("url").notNull(),
		savedAt: int("savedAt", { mode: "timestamp" }).notNull(),
		baseUrl: text("baseUrl", { length: 255 }).unique(),
		ogImage: text("ogImage", { length: 255 }),
		type: text("type").default("page"),
		image: text("image", { length: 255 }),
		userId: text("user").references(() => users.id, {
			onDelete: "cascade",
		}),
		noteId: integer("noteId"),
	},
	(sc) => ({
		urlIdx: index("storedContent_url_idx").on(sc.url),
		savedAtIdx: index("storedContent_savedAt_idx").on(sc.savedAt),
		titleInx: index("storedContent_title_idx").on(sc.title),
		userIdx: index("storedContent_user_idx").on(sc.userId),
	}),
);

export type Content = typeof storedContent.$inferSelect;

export const contentToSpace = createTable(
	"contentToSpace",
	{
		contentId: integer("contentId")
			.notNull()
			.references(() => storedContent.id, { onDelete: "cascade" }),
		spaceId: integer("spaceId")
			.notNull()
			.references(() => space.id, { onDelete: "cascade" }),
	},
	(cts) => ({
		compoundKey: primaryKey({ columns: [cts.contentId, cts.spaceId] }),
	}),
);

export const space = createTable(
	"space",
	{
		id: integer("id").notNull().primaryKey({ autoIncrement: true }),
		name: text("name").notNull().unique().default("none"),
		user: text("user", { length: 255 }).references(() => users.id, {
			onDelete: "cascade",
		}),
		createdAt: int("createdAt", { mode: "timestamp" }).notNull(),
		numItems: integer("numItems").notNull().default(0),
	},
	(space) => ({
		nameIdx: index("spaces_name_idx").on(space.name),
		userIdx: index("spaces_user_idx").on(space.user),
	}),
);

export const spacesAccess = createTable(
	"spacesAccess",
	{
		spaceId: integer("spaceId")
			.notNull()
			.references(() => space.id, { onDelete: "cascade" }),
		userEmail: text("userEmail").notNull(),
	},
	(spaceAccess) => ({
		compoundKey: primaryKey({
			columns: [spaceAccess.spaceId, spaceAccess.userEmail],
		}),
	}),
);

export type StoredContent = Omit<typeof storedContent.$inferSelect, "user">;
export type StoredSpace = typeof space.$inferSelect;
export type ChachedSpaceContent = StoredContent & {
	space: number;
};

export const chatThreads = createTable(
	"chatThread",
	{
		id: text("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		firstMessage: text("firstMessage").notNull(),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
	},
	(thread) => ({
		userIdx: index("chatThread_user_idx").on(thread.userId),
	}),
);

export const chatHistory = createTable(
	"chatHistory",
	{
		id: integer("id").notNull().primaryKey({ autoIncrement: true }),
		threadId: text("threadId")
			.notNull()
			.references(() => chatThreads.id, { onDelete: "cascade" }),
		question: text("question").notNull(),
		answer: text("answerParts"), // Single answer part as string
		answerSources: text("answerSources"), // JSON stringified array of objects
		answerJustification: text("answerJustification"),
		createdAt: int("createdAt", { mode: "timestamp" })
			.notNull()
			.default(new Date()),
	},
	(history) => ({
		threadIdx: index("chatHistory_thread_idx").on(history.threadId),
	}),
);

export const canvas = createTable(
	"canvas",
	{
		id: text("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		title: text("title").default("Untitled").notNull(),
		description: text("description").default("Untitled").notNull(),
		imageUrl: text("url").default("").notNull(),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
	},
	(canvas) => ({
		userIdx: index("canvas_user_userId").on(canvas.userId),
	}),
);

export type ChatThread = typeof chatThreads.$inferSelect;
export type ChatHistory = typeof chatHistory.$inferSelect;
