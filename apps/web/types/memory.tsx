import { db } from '@/server/db';
import { contentToSpace, space, StoredContent } from '@/server/db/schema';
import { eq, inArray, or } from 'drizzle-orm';

export const transformContent = async (
  content: StoredContent[],
): Promise<CollectedSpaces[]> => {
  const collectedSpaces = await db
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

  const result = collectedSpaces.map((s) => ({
    id: s.id,
    title: s.name,
    content: content.filter((c) => c.id === s.contentId),
  }));

  return result;
};

export type CollectedSpaces = {
  id: number;
  title: string;
  content: StoredContent[];
};
