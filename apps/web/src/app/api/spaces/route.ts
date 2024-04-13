import { db } from "@/server/db";
import { sessions, space, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

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

  if (process.env.RATELIMITER) {
    const { success } = await process.env.RATELIMITER.limit({ key: token });

    if (!success) {
      return new Response(JSON.stringify({ message: "Rate limit exceeded" }), {
        status: 429,
      });
    }
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

  const userData = await db
    .select()
    .from(users)
    .where(eq(users.id, sessionData[0].userId))
    .limit(1);

  if (!userData || userData.length === 0) {
    return NextResponse.json(
      { message: "Invalid Key, session not found." },
      { status: 404 },
    );
  }

  const user = userData[0];

  const spaces = await db
    .select()
    .from(space)
    .where(eq(space.user, user.id))
    .all();

  return NextResponse.json(
    {
      message: "OK",
      data: spaces,
    },
    { status: 200 },
  );
}
