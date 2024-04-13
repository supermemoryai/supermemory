"use server";
import { cookies, headers } from "next/headers";
import { db } from "@/server/db";
import {
  contentToSpace,
  sessions,
  StoredContent,
  storedContent,
	StoredSpace,
  users,
	space,
} from "@/server/db/schema";
import { SearchResult } from "@/contexts/MemoryContext";
import { like, eq, and, sql, exists, asc, notExists } from "drizzle-orm";
import { union } from "drizzle-orm/sqlite-core"

// @todo: (future) pagination not yet needed
export async function searchMemoriesAndSpaces(query: string, opts?: { filter?: { memories?: boolean, spaces?: boolean }, range?: { offset: number, limit: number } }): Promise<SearchResult[]> {

	const user = await getUser()

	if (!user) {
		return []
	}

	try  {
		const searchMemoriesQuery = db.select({
			type: sql<string>`'memory'`,
			space: sql`NULL`,
			memory: storedContent as any
		}).from(storedContent).where(and(
			eq(storedContent.user, user.id),
			like(storedContent.title, `%${query}%`)
		));

		const searchSpacesQuery = db.select({
			type: sql<string>`'space'`,
			space: space as any,
			memory: sql`NULL`,
		}).from(space).where(
			and(
				eq(space.user, user.id),
				like(space.name, `%${query}%`)
			)
		);
	
		let queries = [];

		[undefined, true].includes(opts?.filter?.memories) && queries.push(searchMemoriesQuery);
		[undefined, true].includes(opts?.filter?.spaces) && queries.push(searchSpacesQuery);

		if (opts?.range) {
			queries = queries.map(q => q.offset(opts.range!.offset).limit(opts.range!.limit))
		} else {
			queries = queries.map(q => q.all())
		}

		const data = await Promise.all(queries)
		
		return data.reduce((acc, i) => [...acc, ...i]) as SearchResult[]
	} catch {
		return []
	}

}

async function getUser() {
  const token =
    cookies().get("next-auth.session-token")?.value ??
    cookies().get("__Secure-authjs.session-token")?.value ??
    cookies().get("authjs.session-token")?.value ??
    headers().get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return null
  }

  const session = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionToken, token!));

  if (!session || session.length === 0) {
    return null
  }

  const [userData] = await db
    .select()
    .from(users)
    .where(eq(users.id, session[0].userId))
    .limit(1);

  if (!userData) {
    return null
  }

  return userData
}

export async function getMemory(title: string) {
  const user = await getUser();

  if (!user) {
    return null
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
    return null
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

export async function addSpace(name: string, memories: number[]) {

	const user = await getUser();

	if (!user) {
		return null
	}

	const [addedSpace] = await db
		.insert(space)
		.values({
			name: name,
			user: user.id
		}).returning();
	
	const addedMemories = memories.length > 0 ? await db.insert(contentToSpace)
		.values(memories.map(m => ({
			contentId: m,
			spaceId: addedSpace.id
		}))).returning() : []
	
	return {
		space: addedSpace,
		addedMemories
	}
}


export async function fetchContentForSpace(
  spaceId: number,
  range?: {
    offset: number;
    limit: number;
  },
) {

  const query = db
    .select()
    .from(storedContent)
    .where(
      exists(
        db.select().from(contentToSpace).where(and(eq(contentToSpace.spaceId, spaceId), eq(contentToSpace.contentId, storedContent.id))),
      ),
    ).orderBy(asc(storedContent.title))

	return range ? await query.limit(range.limit).offset(range.offset) : await query.all()
}

export async function fetchFreeMemories(
	range?: {
		offset: number;
		limit: number;
	}
) {

	const user = await getUser()

	if (!user) {
		return []
	}

	const query = db
    .select()
    .from(storedContent)
    .where(
			and(
				notExists(
					db.select().from(contentToSpace).where(eq(contentToSpace.contentId, storedContent.id)),
				),
				eq(storedContent.user, user.id),
			)
      
    ).orderBy(asc(storedContent.title))

	return range ? await query.limit(range.limit).offset(range.offset) : await query.all()

}
