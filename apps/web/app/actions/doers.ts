"use server";

import { revalidatePath } from "next/cache";
import { db } from "../../server/db";
import {
  chatHistory,
  chatThreads,
  contentToSpace,
  space,
  storedContent,
  users,
} from "../../server/db/schema";
import { ServerActionReturnType } from "./types";
import { auth } from "../../server/auth";
import { Tweet } from "react-tweet/api";
import { getMetaData } from "@/lib/get-metadata";
import { and, eq, inArray, sql } from "drizzle-orm";
import { LIMITS } from "@/lib/constants";
import { z } from "zod";
import { ChatHistory } from "@repo/shared-types";
import { decipher } from "@/server/encrypt";
import { redirect } from "next/navigation";

export const createSpace = async (
  input: string | FormData,
): ServerActionReturnType<number> => {
  const data = await auth();

  if (!data || !data.user) {
    redirect("/signin");
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

const typeDecider = (content: string) => {
  // if the content is a URL, then it's a page. if its a URL with https://x.com/user/status/123, then it's a tweet. else, it's a note.
  // do strict checking with regex
  if (content.match(/https?:\/\/[\w\.]+\/[\w]+\/[\w]+\/[\d]+/)) {
    return "tweet";
  } else if (content.match(/https?:\/\/[\w\.]+/)) {
    return "page";
  } else if (content.match(/https?:\/\/www\.[\w\.]+/)) {
    return "page";
  } else {
    return "note";
  }
};

export const limit = async (userId: string, type = "page") => {
  const count = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(storedContent)
    .where(and(eq(storedContent.userId, userId), eq(storedContent.type, type)));

  if (count[0]!.count > LIMITS[type as keyof typeof LIMITS]) {
    return false;
  }

  return true;
};

const getTweetData = async (tweetID: string) => {
  const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetID}&lang=en&features=tfw_timeline_list%3A%3Btfw_follower_count_sunset%3Atrue%3Btfw_tweet_edit_backend%3Aon%3Btfw_refsrc_session%3Aon%3Btfw_fosnr_soft_interventions_enabled%3Aon%3Btfw_show_birdwatch_pivots_enabled%3Aon%3Btfw_show_business_verified_badge%3Aon%3Btfw_duplicate_scribes_to_settings%3Aon%3Btfw_use_profile_image_shape_enabled%3Aon%3Btfw_show_blue_verified_badge%3Aon%3Btfw_legacy_timeline_sunset%3Atrue%3Btfw_show_gov_verified_badge%3Aon%3Btfw_show_business_affiliate_badge%3Aon%3Btfw_tweet_edit_frontend%3Aon&token=4c2mmul6mnh`;

  const resp = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.5",
      "Accept-Encoding": "gzip, deflate, br",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0",
      TE: "Trailers",
    },
  });
  console.log(resp.status);
  const data = (await resp.json()) as Tweet;

  return data;
};

export const createMemory = async (input: {
  content: string;
  spaces?: string[];
}): ServerActionReturnType<number> => {
  const data = await auth();

  if (!data || !data.user || !data.user.id) {
    redirect("/signin");
    return { error: "Not authenticated", success: false };
  }

  const type = typeDecider(input.content);

  let pageContent = input.content;
  let metadata: Awaited<ReturnType<typeof getMetaData>>;

  if (!(await limit(data.user.id, type))) {
    return {
      success: false,
      data: 0,
      error: `You have exceeded the limit of ${LIMITS[type as keyof typeof LIMITS]} ${type}s.`,
    };
  }

  if (type === "page") {
    const response = await fetch("https://md.dhr.wtf/?url=" + input.content, {
      headers: {
        Authorization: "Bearer " + process.env.BACKEND_SECURITY_KEY,
      },
    });
    pageContent = await response.text();

    try {
      metadata = await getMetaData(input.content);
    } catch (e) {
      return {
        success: false,
        error: "Failed to fetch metadata for the page. Please try again later.",
      };
    }
  } else if (type === "tweet") {
    const tweet = await getTweetData(input.content.split("/").pop() as string);
    pageContent = JSON.stringify(tweet);
    metadata = {
      baseUrl: input.content,
      description: tweet.text,
      image: tweet.user.profile_image_url_https,
      title: `Tweet by ${tweet.user.name}`,
    };
  } else if (type === "note") {
    pageContent = input.content;
    const noteId = new Date().getTime();
    metadata = {
      baseUrl: `https://supermemory.ai/note/${noteId}`,
      description: `Note created at ${new Date().toLocaleString()}`,
      image: "https://supermemory.ai/logo.png",
      title: `${pageContent.slice(0, 20)} ${pageContent.length > 20 ? "..." : ""}`,
    };
  } else {
    return {
      success: false,
      data: 0,
      error: "Invalid type",
    };
  }

  let storeToSpaces = input.spaces;

  if (!storeToSpaces) {
    storeToSpaces = [];
  }

  console.log(storeToSpaces);
  const vectorSaveResponse = await fetch(
    `${process.env.BACKEND_BASE_URL}/api/add`,
    {
      method: "POST",
      body: JSON.stringify({
        pageContent,
        title: metadata.title,
        description: metadata.description,
        url: metadata.baseUrl,
        spaces: storeToSpaces,
        user: data.user.id,
        type,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + process.env.BACKEND_SECURITY_KEY,
      },
    },
  );

  if (!vectorSaveResponse.ok) {
    const errorData = await vectorSaveResponse.text();
    console.error(errorData);
    return {
      success: false,
      data: 0,
      error: `Failed to save to vector store. Backend returned error: ${errorData}`,
    };
  }

  // Insert into database
  const insertResponse = await db
    .insert(storedContent)
    .values({
      content: pageContent,
      title: metadata.title,
      description: metadata.description,
      url: input.content,
      baseUrl: metadata.baseUrl,
      image: metadata.image,
      savedAt: new Date(),
      userId: data.user.id,
      type,
    })
    .returning({ id: storedContent.id });

  const contentId = insertResponse[0]?.id;
  if (!contentId) {
    return {
      success: false,
      data: 0,
      error: "Something went wrong while saving the document to the database",
    };
  }

  if (storeToSpaces.length > 0) {
    // Adding the many-to-many relationship between content and spaces
    const spaceData = await db
      .select()
      .from(space)
      .where(
        and(
          inArray(
            space.id,
            storeToSpaces.map((s) => parseInt(s)),
          ),
          eq(space.user, data.user.id),
        ),
      )
      .all();

    await Promise.all(
      spaceData.map(async (space) => {
        await db
          .insert(contentToSpace)
          .values({ contentId: contentId, spaceId: space.id });
      }),
    );
  }

  try {
    const response = await vectorSaveResponse.json();

    const expectedResponse = z.object({ status: z.literal("ok") });

    const parsedResponse = expectedResponse.safeParse(response);

    if (!parsedResponse.success) {
      return {
        success: false,
        data: 0,
        error: `Failed to save to vector store. Backend returned error: ${parsedResponse.error.message}`,
      };
    }

    return {
      success: true,
      data: 1,
    };
  } catch (e) {
    return {
      success: false,
      data: 0,
      error: `Failed to save to vector store. Backend returned error: ${e}`,
    };
  }
};

export const createChatThread = async (
  firstMessage: string,
): ServerActionReturnType<string> => {
  const data = await auth();

  if (!data || !data.user || !data.user.id) {
    redirect("/signin");
    return { error: "Not authenticated", success: false };
  }

  const thread = await db
    .insert(chatThreads)
    .values({
      firstMessage,
      userId: data.user.id,
    })
    .returning({ id: chatThreads.id })
    .execute();

  console.log(thread);

  if (!thread[0]) {
    return {
      success: false,
      error: "Failed to create chat thread",
    };
  }

  return { success: true, data: thread[0].id };
};

export const createChatObject = async (
  threadId: string,
  chatHistorySoFar: ChatHistory[],
): ServerActionReturnType<boolean> => {
  const data = await auth();

  if (!data || !data.user || !data.user.id) {
    redirect("/signin");
    return { error: "Not authenticated", success: false };
  }

  const lastChat = chatHistorySoFar[chatHistorySoFar.length - 1];
  if (!lastChat) {
    return {
      success: false,
      data: false,
      error: "No chat object found",
    };
  }
  console.log("sources: ", lastChat.answer.sources);

  const saved = await db.insert(chatHistory).values({
    question: lastChat.question,
    answer: lastChat.answer.parts.map((part) => part.text).join(""),
    answerSources: JSON.stringify(lastChat.answer.sources),
    threadId,
  });

  if (!saved) {
    return {
      success: false,
      data: false,
      error: "Failed to save chat object",
    };
  }

  return {
    success: true,
    data: true,
  };
};

export const linkTelegramToUser = async (
  telegramUser: string,
): ServerActionReturnType<boolean> => {
  const data = await auth();

  if (!data || !data.user || !data.user.id) {
    redirect("/signin");
    return { error: "Not authenticated", success: false };
  }

  const user = await db
    .update(users)
    .set({ telegramId: decipher(telegramUser) })
    .where(eq(users.id, data.user.id))
    .execute();

  if (!user) {
    return {
      success: false,
      data: false,
      error: "Failed to link telegram to user",
    };
  }

  return {
    success: true,
    data: true,
  };
};
