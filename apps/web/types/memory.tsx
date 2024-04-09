import { db } from '@/server/db';
import { contentToSpace, space, StoredContent } from '@/server/db/schema';
import { eq, inArray, or } from 'drizzle-orm';

export const transformContent = async (
  content: StoredContent[],
): Promise<CollectedSpaces[]> => {
  // Retrieve spaces and their associated content from the database
  const spacesWithContent = await db
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
    )
    .all();

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
  role: 'user' | 'model';
  parts: [{ text: string }];
};
