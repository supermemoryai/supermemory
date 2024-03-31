import { relations, sql } from "drizzle-orm";
import {
  index,
  int,
  primaryKey,
  sqliteTableCreator,
  text,
  integer,
  unique,
} from "drizzle-orm/sqlite-core";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = sqliteTableCreator((name) => `${name}`);

export const users = createTable("user", {
  id: text("id", { length: 255 }).notNull().primaryKey(),
  name: text("name", { length: 255 }),
  email: text("email", { length: 255 }).notNull(),
  emailVerified: int("emailVerified", { mode: "timestamp" }).default(
    sql`CURRENT_TIMESTAMP`,
  ),
  image: text("image", { length: 255 }),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accounts = createTable(
  "account",
  {
    id: integer("id").notNull().primaryKey({ autoIncrement: true }),
    userId: text("userId", { length: 255 })
      .notNull()
      .references(() => users.id),
    type: text("type", { length: 255 }).notNull(),
    provider: text("provider", { length: 255 }).notNull(),
    providerAccountId: text("providerAccountId", { length: 255 }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: int("expires_at"),
    token_type: text("token_type", { length: 255 }),
    scope: text("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: text("session_state", { length: 255 }),
    oauth_token_secret: text("oauth_token_secret"),
    oauth_token: text("oauth_token"),
  },
  (account) => ({
    userIdIdx: index("account_userId_idx").on(account.userId),
  }),
);

export const sessions = createTable(
  "session",
  {
    id: integer("id").notNull().primaryKey({ autoIncrement: true }),
    sessionToken: text("sessionToken", { length: 255 }).notNull(),
    userId: text("userId", { length: 255 })
      .notNull()
      .references(() => users.id),
    expires: int("expires", { mode: "timestamp" }).notNull(),
  },
  (session) => ({
    userIdIdx: index("session_userId_idx").on(session.userId),
  }),
);

export const verificationTokens = createTable(
  "verificationToken",
  {
    identifier: text("identifier", { length: 255 }).notNull(),
    token: text("token", { length: 255 }).notNull(),
    expires: int("expires", { mode: "timestamp" }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  }),
);

export const userStoredContent = createTable(
  "userStoredContent",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id),
    contentId: integer("contentId")
      .notNull()
      .references(() => storedContent.id),
  },
  (usc) => ({
    userContentIdx: index("userStoredContent_idx").on(
      usc.userId,
      usc.contentId,
    ),
    uniqueUserContent: unique("unique_user_content").on(
      usc.userId,
      usc.contentId,
    ),
  }),
);

export const storedContent = createTable(
  "storedContent",
  {
    id: integer("id").notNull().primaryKey({ autoIncrement: true }),
    content: text("content").notNull(),
    title: text("title", { length: 255 }),
    description: text("description", { length: 255 }),
    url: text("url").notNull().unique(),
    savedAt: int("savedAt", { mode: "timestamp" }).notNull(),
    baseUrl: text("baseUrl", { length: 255 }),
    image: text("image", { length: 255 }),
  },
  (sc) => ({
    urlIdx: index("storedContent_url_idx").on(sc.url),
    savedAtIdx: index("storedContent_savedAt_idx").on(sc.savedAt),
    titleInx: index("storedContent_title_idx").on(sc.title),
  }),
);

export type StoredContent = typeof storedContent.$inferSelect;
