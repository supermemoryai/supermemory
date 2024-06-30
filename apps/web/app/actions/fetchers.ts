"use server";

import { and, asc, eq, inArray, not, sql } from "drizzle-orm";
import { db } from "../../server/db";
import {
  chatHistory,
  ChatThread,
  chatThreads,
  Content,
  contentToSpace,
  storedContent,
  StoredSpace,
  users,
} from "../../server/db/schema";
import { ServerActionReturnType, Space } from "./types";
import { auth } from "../../server/auth";
import { ChatHistory, SourceZod } from "@repo/shared-types";
import { ChatHistory as ChatHistoryType } from "../../server/db/schema";
import { z } from "zod";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";

export const getSpaces = async (): ServerActionReturnType<StoredSpace[]> => {
  const data = await auth();

  if (!data || !data.user) {
    redirect("/signin");
    return { error: "Not authenticated", success: false };
  }

  const spaces = await db.query.space.findMany({
    where: eq(users, data.user.id),
  });

  return { success: true, data: spaces };
};

export const getAllMemories = async (
  freeMemoriesOnly: boolean = false,
): ServerActionReturnType<Content[]> => {
  const data = await auth();

  if (!data || !data.user) {
    redirect("/signin");
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
  spaces: StoredSpace[];
  memories: Content[];
}> => {
  const data = await auth();

  if (!data || !data.user) {
    redirect("/signin");
    return { error: "Not authenticated", success: false };
  }

  const spaces = await db.query.space.findMany({
    where: eq(users, data.user.id),
  });

  const memories = await db.query.storedContent.findMany({
    where: eq(users, data.user.id),
  });

  return {
    success: true,
    data: { spaces: spaces, memories: memories },
  };
};

export const getFullChatThread = async (
  threadId: string,
): ServerActionReturnType<ChatHistory[]> => {
  const data = await auth();

  if (!data || !data.user || !data.user.id) {
    redirect("/signin");
    return { error: "Not authenticated", success: false };
  }

  const thread = await db.query.chatThreads.findFirst({
    where: and(
      eq(chatThreads.id, threadId),
      eq(chatThreads.userId, data.user.id),
    ),
  });

  if (!thread) {
    return { error: "Thread not found", success: false };
  }

  const allChatsInThisThread = await db.query.chatHistory
    .findMany({
      where: and(eq(chatHistory.threadId, threadId)),
      orderBy: asc(chatHistory.id),
    })
    .execute();

  const accumulatedChatHistory: ChatHistory[] = allChatsInThisThread.map(
    (chat) => {
      console.log("answer sources", chat.answerSources);
      const sourceCheck = z
        .array(SourceZod)
        .safeParse(JSON.parse(chat.answerSources ?? "[]"));

      if (!sourceCheck.success || !sourceCheck.data) {
        console.error("sourceCheck.error", sourceCheck.error);
        throw new Error("Invalid source data");
      }

      const sources = sourceCheck.data;

      return {
        question: chat.question,
        answer: {
          parts: [
            {
              text: chat.answer ?? undefined,
            },
          ],
          sources: sources ?? [],
        },
      };
    },
  );

  return {
    success: true,
    data: accumulatedChatHistory,
  };
};

export const getChatHistory = async (): ServerActionReturnType<
  ChatThread[]
> => {
  const data = await auth();

  if (!data || !data.user || !data.user.id) {
    redirect("/signin");
    return { error: "Not authenticated", success: false };
  }

  try {
    const chatHistorys = await db.query.chatThreads.findMany({
      where: eq(chatThreads.userId, data.user.id),
    });

    return {
      success: true,
      data: chatHistorys,
    };
  } catch (e) {
    return {
      success: false,
      error: (e as Error).message,
    };
  }
};

export const getSessionAuthToken = async (): ServerActionReturnType<string> => {
  const token =
    cookies().get("next-auth.session-token")?.value ??
    cookies().get("__Secure-authjs.session-token")?.value ??
    cookies().get("authjs.session-token")?.value ??
    headers().get("Authorization")?.replace("Bearer ", "");

  return {
    success: true,
    data: token,
  };
};
