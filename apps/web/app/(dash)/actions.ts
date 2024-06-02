"use server";

import { cookies, headers } from "next/headers";
import { db } from "../helpers/server/db";
import { sessions, users, space } from "../helpers/server/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function ensureAuth() {
  const token =
    cookies().get("next-auth.session-token")?.value ??
    cookies().get("__Secure-authjs.session-token")?.value ??
    cookies().get("authjs.session-token")?.value ??
    headers().get("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return undefined;
  }

  const sessionData = await db
    .select()
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.sessionToken, token));

  if (!sessionData || sessionData.length < 0) {
    return undefined;
  }

  return {
    user: sessionData[0]!.user,
    session: sessionData[0]!,
  };
}

export async function getSpaces() {
  const data = await ensureAuth();
  if (!data) {
    redirect("/signin");
  }

  const sp = await db
    .select()
    .from(space)
    .where(eq(space.user, data.user.email));

  return sp;
}
