"use server";

import { revalidatePath } from "next/cache";
import { db } from "../helpers/server/db";
import { space } from "../helpers/server/db/schema";
import { ServerActionReturnType } from "./types";
import { auth } from "../helpers/server/auth";

export const createSpace = async (
  input: string | FormData,
): ServerActionReturnType<number> => {
  const data = await auth();

  if (!data || !data.user) {
    return { error: "Not authenticated", success: false };
  }

  if (typeof input === "object") {
    input = (input as FormData).get("name") as string;
  }

  try {
    const resp = await db
      .insert(space)
      .values({ name: input, user: data.user.id });

    revalidatePath("/home");
    return { success: true, data: 1 };
  } catch (e: unknown) {
    const error = e as Error;
    if (
      error.message.includes("D1_ERROR: UNIQUE constraint failed: space.name")
    ) {
      return { success: false, data: 0, error: "Space already exists" };
    } else {
      return {
        success: false,
        data: 0,
        error: "Failed to create space with error: " + error.message,
      };
    }
  }
};
