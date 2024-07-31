import {
	index,
	int,
	primaryKey,
	sqliteTableCreator,
	text,
	integer,
} from "drizzle-orm/sqlite-core";

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