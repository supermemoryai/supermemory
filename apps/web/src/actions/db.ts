"use server";
import { cookies, headers } from "next/headers";
import { db } from "@/server/db";
import {
  contentToSpace,
  sessions,
  StoredContent,
  storedContent,
  users,
  space,
} from "@/server/db/schema";
import { like, eq, and, sql } from "drizzle-orm";
import { union } from "drizzle-orm/sqlite-core";
import { auth as authOptions } from "@/server/auth";
import { FormEvent } from "react";
import { revalidatePath } from "next/cache";

// @todo: (future) pagination not yet needed
export async function searchMemoriesAndSpaces(userId: string, query: string) {
  const searchMemoriesQuery = db
    .select({
      type: sql<string>`'memory'`,
      space: sql`NULL`,
      memory: storedContent as any,
    })
    .from(storedContent)
    .where(
      and(
        eq(storedContent.user, userId),
        like(storedContent.title, `%${query}%`),
      ),
    );

  const searchSpacesQuery = db
    .select({
      type: sql<string>`'space'`,
      space: space as any,
      memory: sql`NULL`,
    })
    .from(space)
    .where(and(eq(space.user, userId), like(space.name, `%${query}%`)));

  return await union(searchMemoriesQuery, searchSpacesQuery);
}

async function getUser() {
  const token =
    cookies().get("next-auth.session-token")?.value ??
    cookies().get("__Secure-authjs.session-token")?.value ??
    cookies().get("authjs.session-token")?.value ??
    headers().get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return null;
  }

  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionToken, token!));

  if (!session || session.length === 0) {
    return null;
  }

  const [userData] = await db
    .select()
    .from(users)
    .where(eq(users.id, session[0].userId))
    .limit(1);

  if (!userData) {
    return null;
  }

  return userData;
}

export async function getMemory(title: string) {
  const user = await getUser();

  if (!user) {
    return null;
  }

  return await db
    .select()
    .from(storedContent)
    .where(
      and(
        eq(storedContent.user, user.id),
        like(storedContent.title, `%${title}%`),
      ),
    );
}

export async function addMemory(
  content: typeof storedContent.$inferInsert,
  spaces: number[],
) {
  const user = await getUser();

  if (!user) {
    return null;
  }
  content.user = user.id;

  const _content = (
    await db.insert(storedContent).values(content).returning()
  )[0];
  await Promise.all(
    spaces.map((spaceId) =>
      db.insert(contentToSpace).values({ contentId: _content.id, spaceId }),
    ),
  );
  return _content;
}
