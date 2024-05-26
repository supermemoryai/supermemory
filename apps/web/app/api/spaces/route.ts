import { db } from "@/app/helpers/server/db";
import { sessions, space, users } from "@/app/helpers/server/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { ensureAuth } from "../ensureAuth";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const session = await ensureAuth(req);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const spaces = await db
    .select()
    .from(space)
    .where(eq(space.user, session.user.id))
    .all();

  return NextResponse.json(
    {
      message: "OK",
      data: spaces,
    },
    { status: 200 },
  );
}
