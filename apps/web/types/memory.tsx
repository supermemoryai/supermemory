import { db } from "@/server/db";
import {
  contentToSpace,
  space,
  storedContent,
  StoredContent,
} from "@/server/db/schema";
import { asc, and, eq, inArray, notExists, sql, exists } from "drizzle-orm";

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
        db
          .select()
          .from(contentToSpace)
          .where(
            and(
              eq(contentToSpace.spaceId, spaceId),
              eq(contentToSpace.contentId, storedContent.id),
            ),
          ),
      ),
    )
    .orderBy(asc(storedContent.title));

  return range
    ? await query.limit(range.limit).offset(range.offset)
    : await query.all();
}

export async function fetchFreeMemories(
  userId: string,
  range?: {
    offset: number;
    limit: number;
  },
) {
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
        eq(storedContent.user, userId),
      ),
    )
    .orderBy(asc(storedContent.title));

  return range
    ? await query.limit(range.limit).offset(range.offset)
    : await query.all();
}

export const transformContent = async (
  content: StoredContent[],
  limit?: number,
): Promise<CollectedSpaces[]> => {
  // Retrieve spaces and their associated content from the database
  const query = db
    .select({
      id: space.id,
      name: space.name,
      contentId: contentToSpace.contentId,
    })
    .from(space)
    .leftJoin(contentToSpace, eq(space.id, contentToSpace.spaceId))
    .where(
      inArray(
        contentToSpace.contentId,
        content.map((c: StoredContent) => c.id),
      ),
    );

  const spacesWithContent = limit
    ? await query.limit(limit)
    : await query.all();

  // Group content by id
  const contentById = content.reduce(
    (acc, c) => {
      acc[c.id] = acc[c.id] || [];
      acc[c.id].push(c);
      return acc;
    },
    {} as { [key: number]: StoredContent[] },
  );

  // Aggregate content for each space
  const aggregatedSpaces = spacesWithContent.reduce(
    (acc, space) => {
      if (!acc[space.id]) {
        acc[space.id] = { id: space.id, title: space.name, content: [] };
      }
      acc[space.id].content.push(...contentById[space.contentId!]);
      return acc;
    },
    {} as { [key: number]: CollectedSpaces },
  );

  // Convert the aggregated spaces object to an array
  return Object.values(aggregatedSpaces);
};

export type CollectedSpaces = {
  id: number;
  title: string;
  content: StoredContent[];
};

export type ChatHistory = {
  question: string;
  answer: {
    parts: { text: string }[];
    sources: string[];
  };
};
