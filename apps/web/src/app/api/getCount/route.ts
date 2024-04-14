import { db } from "@/server/db";
import { and, eq, ne, sql } from "drizzle-orm";
import { sessions, storedContent, users } from "@/server/db/schema";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
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

  const tweetsCount = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(storedContent)
    .where(
      and(
        eq(storedContent.user, session.user.id),
        eq(storedContent.type, "twitter-bookmark"),
      ),
    );

  const pageCount = await db
    .select({
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(storedContent)
    .where(
      and(
        eq(storedContent.user, session.user.id),
        ne(storedContent.type, "twitter-bookmark"),
      ),
    );

  return NextResponse.json({
    tweetsCount: tweetsCount[0].count,
    tweetsLimit: 1000,
    pageCount: pageCount[0].count,
    pageLimit: 100,
    user: session.user.email,
  });
}
