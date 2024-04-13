import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { sessions, storedContent, users } from "@/server/db/schema";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

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
      JSON.stringify({ message: "Invalid Key, session not found." }),
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

  const body = (await req.json()) as TweetData[];

  const resp = await fetch(
    `https://cf-ai-backend.dhravya.workers.dev/batchUploadTweets`,
    {
      headers: {
        "X-Custom-Auth-Key": env.BACKEND_SECURITY_KEY,
      },
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  return new Response(await resp.text(), {
    status: resp.status,
    headers: resp.headers,
  });
}
