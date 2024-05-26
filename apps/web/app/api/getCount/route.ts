import { db } from "@/app/helpers/server/db";
import { and, eq, ne, sql } from "drizzle-orm";
import { sessions, storedContent, users } from "@/app/helpers/server/db/schema";
import { type NextRequest, NextResponse } from "next/server";
import { ensureAuth } from "../ensureAuth";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const session = await ensureAuth(req);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

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
    tweetsCount: tweetsCount[0]!.count,
    tweetsLimit: 1000,
    pageCount: pageCount[0]!.count,
    pageLimit: 100,
    user: session.user.email,
  });
}
