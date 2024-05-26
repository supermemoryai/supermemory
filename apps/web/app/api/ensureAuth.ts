import { NextRequest } from "next/server";
import { db } from "../helpers/server/db";
import { sessions, users } from "../helpers/server/db/schema";
import { eq } from "drizzle-orm";

export async function ensureAuth(req: NextRequest) {
  // A helper function to protect routes

  const token =
    req.cookies.get("next-auth.session-token")?.value ??
    req.cookies.get("__Secure-authjs.session-token")?.value ??
    req.cookies.get("authjs.session-token")?.value ??
    req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return undefined;
  }

  const sessionData = await db
    .select()
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.sessionToken, token!));

  if (!sessionData || sessionData.length < 0) {
    return undefined;
  }

  return {
    user: sessionData[0]!.user,
    session: sessionData[0]!,
  };
}
