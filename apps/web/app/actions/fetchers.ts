"use server";

import { eq } from "drizzle-orm";
import { db } from "../helpers/server/db";
import { users } from "../helpers/server/db/schema";
import { ServerActionReturnType, Space } from "./types";
import { auth } from "../helpers/server/auth";

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
