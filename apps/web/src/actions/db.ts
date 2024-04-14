"use server";
import { cookies, headers } from "next/headers";
import { db } from "@/server/db";
import {
  contentToSpace,
  sessions,
  storedContent,
  users,
  space,
} from "@/server/db/schema";
import { SearchResult } from "@/contexts/MemoryContext";
import { like, eq, and, sql, exists, asc, notExists, inArray, notInArray } from "drizzle-orm";
import { union } from "drizzle-orm/sqlite-core";
import { env } from "@/env";

// @todo: (future) pagination not yet needed
export async function searchMemoriesAndSpaces(
  query: string,
  opts?: {
    filter?: { memories?: boolean; spaces?: boolean };
    range?: { offset: number; limit: number };
  },
): Promise<SearchResult[]> {
  const user = await getUser();

  if (!user) {
    return [];
  }

  try {
    const searchMemoriesQuery = db
      .select({
        type: sql<string>`'memory'`,
        space: sql`NULL`,
        memory: storedContent as any,
      })
      .from(storedContent)
      .where(
        and(
          eq(storedContent.user, user.id),
          like(storedContent.title, `%${query}%`),
        ),
      )
      .orderBy(asc(storedContent.savedAt));

    const searchSpacesQuery = db
      .select({
        type: sql<string>`'space'`,
        space: space as any,
        memory: sql`NULL`,
      })
      .from(space)
      .where(and(eq(space.user, user.id), like(space.name, `%${query}%`)))
      .orderBy(asc(space.name));

    let queries = [];

    console.log("adding");

    [undefined, true].includes(opts?.filter?.memories) &&
      queries.push(searchMemoriesQuery);
    [undefined, true].includes(opts?.filter?.spaces) &&
      queries.push(searchSpacesQuery);

    if (opts?.range) {
      queries = queries.map((q) =>
        q.offset(opts.range!.offset).limit(opts.range!.limit),
      );
    } else {
      queries = queries.map((q) => q.all());
    }

    const data = await Promise.all(queries);

    console.log("resp", data);

    return data.reduce((acc, i) => [...acc, ...i]) as SearchResult[];
  } catch {
    return [];
  }
}

export async function getMemoriesFromUrl(urls: string[]) {

  const user = await getUser();

  if (!user) {
    return [];
  }

	return urls.length > 0 ? await db.select()
		.from(storedContent)
		.where(and(
			inArray(storedContent.url, urls),
			eq(storedContent.user, user.id)
		)).all() : []
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

export async function addSpace(name: string, memories: number[]) {
  const user = await getUser();

  if (!user) {
    return null;
  }

  const [addedSpace] = await db
    .insert(space)
    .values({
      name: name,
      user: user.id,
    })
    .returning();

  const addedMemories =
    memories.length > 0
      ? await db
          .insert(contentToSpace)
          .values(
            memories.map((m) => ({
              contentId: m,
              spaceId: addedSpace.id,
            })),
          )
          .returning()
      : [];

  return {
    space: addedSpace,
    addedMemories,
  };
}

export async function fetchContent(id: number) {
	
	
  const user = await getUser();

  if (!user) {
    return null;
  }

	const fetchedMemory = await db.select()
		.from(storedContent)
		.where(and(
			eq(storedContent.id, id),
			eq(storedContent.user, user.id)
		));
	
	const memory = fetchedMemory.length > 0 ? fetchedMemory[0] : null
	
	const spaces = memory ? await db.select()
		.from(contentToSpace)
		.where(
			eq(contentToSpace.contentId, memory.id)
		) : []
	

	return {
		memory,
		spaces: spaces.map(s => s.spaceId)
	}

}

export async function fetchContentForSpace(
  spaceId: number,
  range?: {
    offset: number;
    limit: number;
  },
) {

  const user = await getUser();

  if (!user) {
    return null;
  }

  const query = db
    .select()
    .from(storedContent)
    .where(
      exists(
        db
          .select()
          .from(contentToSpace)
          .where(
            and(
							and(
								eq(contentToSpace.spaceId, spaceId),
								eq(contentToSpace.contentId, storedContent.id),
							),
							exists(
								db.select()
									.from(space)
									.where(and(
										eq(space.user, user.id),
										eq(space.id, contentToSpace.spaceId)
									))
							)
						)
          ),
      ),
    )
    .orderBy(asc(storedContent.savedAt));

  return range
    ? await query.limit(range.limit).offset(range.offset)
    : await query.all();
}

export async function fetchFreeMemories(range?: {
  offset: number;
  limit: number;
}) {
  const user = await getUser();

  if (!user) {
    return [];
  }

	try {
		const query = db
			.select()
			.from(storedContent)
			.where(
				and(
					notExists(
						db
							.select()
							.from(contentToSpace)
							.where(eq(contentToSpace.contentId, storedContent.id)),
					),
					eq(storedContent.user, user.id),
				),
			)
			.orderBy(asc(storedContent.savedAt));

		return range
			? await query.limit(range.limit).offset(range.offset)
			: await query.all();
	} catch {
		return []
	}

}

export async function addMemory(
  content: typeof storedContent.$inferInsert,
  spaces: number[],
) {
  const user = await getUser();

  if (!user) {
    return null;
  }

  if (!content.content || content.content.trim() === "") {
    const resp = await fetch(
      `https://cf-ai-backend.dhravya.workers.dev/getPageContent?url=${content.url}`,
      {
        headers: {
          "X-Custom-Auth-Key": env.BACKEND_SECURITY_KEY,
        },
      },
    );

    const data = await resp.text();

    console.log(data);

    content.content = data;
  }

  if (!content.content || content.content == "") {
    return null;
  }

  let [addedMemory] = await db
    .insert(storedContent)
    .values({
      user: user.id,
      ...content,
    })
    .returning();

  const addedToSpaces =
    spaces.length > 0
      ? await db
          .insert(contentToSpace)
          .values(
            spaces.map((s) => ({
              contentId: addedMemory.id,
              spaceId: s,
            })),
          )
          .returning()
      : [];

	if (content.type === 'note') {
		addedMemory = (await db.update(storedContent)
			.set({
				url: addedMemory.url + addedMemory.id
			})
			.where(eq(storedContent.id, addedMemory.id))
			.returning())[0]
	}

	console.log("adding with:", `${addedMemory.url}-${user.email}`)
  // Add to vectorDB
  const res = (await Promise.race([
    fetch("https://cf-ai-backend.dhravya.workers.dev/add", {
      method: "POST",
      headers: {
        "X-Custom-Auth-Key": env.BACKEND_SECURITY_KEY,
      },
      body: JSON.stringify({
        pageContent: addedMemory.content,
        title: addedMemory.title,
        url: addedMemory.url,
        user: user.email,
      }),
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), 40000),
    ),
  ])) as Response;

  return {
    memory: addedMemory,
    addedToSpaces,
  };
}


export async function updateMemory(
	id: number,
	{ title, content, spaces }: {
		title?: string;
		content?: string;
		spaces?: number[]
	}
) {
  const user = await getUser();

  if (!user) {
    return null;
  }

	console.log("updating")

	const [prev] = await db.select()
		.from(storedContent)
		.where(and(
			eq(storedContent.user, user.id),
			eq(storedContent.id, id)
		));
	
	if (!prev) {
		return null
	}

	const newContent = {
		...(title ? { title }: {}),
		...(content ? { content }: {}),
	}

	const updated = {
		...newContent,
		...prev
	}

	console.log("adding with:", `${updated.url}-${user.email}`)
  // Add to vectorDB
  const res = (await Promise.race([
    fetch("https://cf-ai-backend.dhravya.workers.dev/edit", {
      method: "POST",
      headers: {
        "X-Custom-Auth-Key": env.BACKEND_SECURITY_KEY,
      },
      body: JSON.stringify({
        pageContent: updated.content,
        title: updated.title,
        url: updated.url,
        user: user.email,
				uniqueUrl: updated.url,
      }),
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), 40000),
    ),
  ])) as Response;

  const [updatedMemory] = await db
    .update(storedContent)
    .set(newContent)
		.where(
			eq(storedContent.id, id)
		)
    .returning();
	
	console.log(updatedMemory, newContent)

	const removedFromSpaces = spaces ? 
		spaces.length > 0 ? 
			await db.delete(contentToSpace)
				.where(and(
					notInArray(contentToSpace.spaceId, spaces),
					eq(contentToSpace.contentId, id)
				)).returning()
			: await db.delete(contentToSpace)
				.where(
					eq(contentToSpace.contentId, id)
				)
		: [];

  const addedToSpaces =
    (spaces && spaces.length > 0)
      ? await db
          .insert(contentToSpace)
          .values(
            spaces.map((s) => ({
              contentId: id,
              spaceId: s,
            })),
          )
					.onConflictDoNothing()
          .returning()
      : [];

  return {
    memory: updatedMemory,
    addedToSpaces,
		removedFromSpaces
  };
}

export async function deleteSpace(id: number) {
  const user = await getUser();

  if (!user) {
    return null;
  }

  await db.delete(contentToSpace).where(eq(contentToSpace.spaceId, id));

  const [deleted] = await db
    .delete(space)
    .where(and(eq(space.user, user.id), eq(space.id, id)))
    .returning();

  return deleted;
}

export async function deleteMemory(id: number) {
  const user = await getUser();

  if (!user) {
    return null;
  }

  await db.delete(contentToSpace).where(eq(contentToSpace.contentId, id));

  const [deleted] = await db
    .delete(storedContent)
    .where(and(eq(storedContent.user, user.id), eq(storedContent.id, id)))
    .returning();

	if (deleted) {
		
	console.log("adding with:", `${deleted.url}-${user.email}`)
  const res = (await Promise.race([
    fetch(`https://cf-ai-backend.dhravya.workers.dev/delete` , {
      method: "DELETE",
      headers: {
        "X-Custom-Auth-Key": env.BACKEND_SECURITY_KEY,
      },
			body: JSON.stringify({
				websiteUrl: deleted.url,
				user: user.email
			})
    }),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), 40000),
    ),
		])) as Response;
	}

  return deleted;
}
