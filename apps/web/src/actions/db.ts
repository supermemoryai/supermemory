"use server";
import { db } from "@/server/db";
import {
  contentToSpace,
  StoredContent,
  storedContent,
} from "@/server/db/schema";
import { like, eq, and } from "drizzle-orm";
import { auth as authOptions } from "@/server/auth";
import { getSession } from "next-auth/react";

export async function getMemory(title: string) {
  const session = await getSession();

  console.log(session?.user?.name);

  if (!session || !session.user) {
    return null;
  }

  return await db
    .select()
    .from(storedContent)
    .where(
      and(
        eq(storedContent.user, session.user.id!),
        like(storedContent.title, `%${title}%`),
      ),
    );
}

export async function addMemory(
  content: typeof storedContent.$inferInsert,
  spaces: number[],
) {
  const session = await getSession();

  if (!session || !session.user) {
    return null;
  }
  content.user = session.user.id;

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
