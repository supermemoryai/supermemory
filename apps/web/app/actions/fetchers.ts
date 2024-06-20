"use server";

import { eq, inArray, not, sql } from "drizzle-orm";
import { db } from "../../server/db";
import {
  Content,
  contentToSpace,
  storedContent,
  users,
} from "../../server/db/schema";
import { ServerActionReturnType, Space } from "./types";
import { auth } from "../../server/auth";

export const getSpaces = async (): ServerActionReturnType<Space[]> => {
  const data = await auth();

  if (!data || !data.user) {
    return { error: "Not authenticated", success: false };
  }

  const spaces = await db.query.space.findMany({
    where: eq(users, data.user.id),
  });

  const spacesWithoutUser = spaces.map((space) => {
    return { ...space, user: undefined };
  });

  return { success: true, data: spacesWithoutUser };
};

export const getAllMemories = async (
  freeMemoriesOnly: boolean = false,
): ServerActionReturnType<Content[]> => {
  const data = await auth();

  if (!data || !data.user) {
    return { error: "Not authenticated", success: false };
  }

  if (!freeMemoriesOnly) {
    // Returns all memories, no matter the space.
    const memories = await db.query.storedContent.findMany({
      where: eq(users, data.user.id),
    });

    return { success: true, data: memories };
  }

  // This only returns memories that are not a part of any space.
  // This is useful for home page where we want to show a list of spaces and memories.
  const contentNotInAnySpace = await db
    .select()
    .from(storedContent)
    .where(
      not(
        eq(
          storedContent.id,
          db
            .select({ contentId: contentToSpace.contentId })
            .from(contentToSpace),
        ),
      ),
    )
    .execute();

  return { success: true, data: contentNotInAnySpace };
};

export const getAllUserMemoriesAndSpaces = async (): ServerActionReturnType<{
  spaces: Space[];
  memories: Content[];
}> => {
  const data = await auth();

  if (!data || !data.user) {
    return { error: "Not authenticated", success: false };
  }

  const spaces = await db.query.space.findMany({
    where: eq(users, data.user.id),
  });

  const spacesWithoutUser = spaces.map((space) => {
    return { ...space, user: undefined };
  });

  // const contentCountBySpace = await db
  //   .select({
  //     spaceId: contentToSpace.spaceId,
  //     count: sql<number>`count(*)`.mapWith(Number),
  //   })
  //   .from(contentToSpace)
  //   .where(
  //     inArray(
  //       contentToSpace.spaceId,
  //       spacesWithoutUser.map((space) => space.id),
  //     ),
  //   )
  //   .groupBy(contentToSpace.spaceId)
  //   .execute();

  // console.log(contentCountBySpace);

  // get a count with space mappings like spaceID: count (number of memories in that space)
  const contentCountBySpace = await db
    .select({
      spaceId: contentToSpace.spaceId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(contentToSpace)
    .where(
      inArray(
        contentToSpace.spaceId,
        spacesWithoutUser.map((space) => space.id),
      ),
    )
    .groupBy(contentToSpace.spaceId)
    .execute();

  console.log(contentCountBySpace);

  const contentNotInAnySpace = await db
    .select()
    .from(storedContent)
    .where(
      not(
        eq(
          storedContent.id,
          db
            .select({ contentId: contentToSpace.contentId })
            .from(contentToSpace),
        ),
      ),
    )
    .execute();

  return {
    success: true,
    data: { spaces: spacesWithoutUser, memories: contentNotInAnySpace },
  };
};
