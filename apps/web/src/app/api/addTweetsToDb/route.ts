import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { sessions, storedContent, users } from "@/server/db/schema";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface TweetData {
  tweetText: string;
  postUrl: string;
  authorName: string;
  handle: string;
  time: string;
  saveToUser: string;
}

export async function POST(req: NextRequest) {
  const token =
    req.cookies.get("next-auth.session-token")?.value ??
    req.cookies.get("__Secure-authjs.session-token")?.value ??
    req.cookies.get("authjs.session-token")?.value ??
    req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return new Response(
      JSON.stringify({ message: "Invalid Key, TOKEN not found." }),
      { status: 404 },
    );
  }

  const sessionData = await db
    .select()
    .from(sessions)
    .where(eq(sessions.sessionToken, token!));

  if (!sessionData || sessionData.length === 0) {
    return new Response(
      JSON.stringify({ message: "Invalid Key, session not found." }),
      { status: 404 },
    );
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, sessionData[0].userId))
    .limit(1);

  if (!user || user.length === 0) {
    return NextResponse.json(
      { message: "Invalid Key, session not found." },
      { status: 404 },
    );
  }

  const session = { session: sessionData[0], user: user[0] };

  const data = (await req.json()) as TweetData[];

  for (const tweet of data) {
    const { id } = (
      await db
        .insert(storedContent)
        .values({
          content: tweet.tweetText,
          title: "Twitter Bookmark",
          description: "",
          url: tweet.postUrl,
          baseUrl: "https://twitter.com",
          image: "https://supermemory.dhr.wtf/twitter.svg",
          savedAt: new Date(),
          user: session.user.id,
          type: "twitter-bookmark",
        })
        .returning({ id: storedContent.id })
    )[0];

    if (!id) {
      return NextResponse.json(
        {
          message: "Error",
          error:
            "Something went wrong when inserting the tweet to storedContent",
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ message: "OK", data: "Success" }, { status: 200 });
}
