import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { sessions, users } from "@/server/db/schema";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const token =
    req.cookies.get("next-auth.session-token")?.value ??
    req.cookies.get("__Secure-authjs.session-token")?.value ??
    req.cookies.get("authjs.session-token")?.value ??
    req.headers.get("Authorization")?.replace("Bearer ", "");

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

  const body = (await req.json()) as {
    query: string;
  };

  const resp = await fetch(`https://cf-ai-backend.dhravya.workers.dev/ask`, {
    headers: {
      "X-Custom-Auth-Key": env.BACKEND_SECURITY_KEY,
    },
    method: "POST",
    body: JSON.stringify({
      query: body.query,
    }),
  });

  if (resp.status !== 200 || !resp.ok) {
    const errorData = await resp.json();
    return new Response(
      JSON.stringify({ message: "Error in CF function", error: errorData }),
      { status: resp.status },
    );
  }

  // Stream the response back to the client
  const { readable, writable } = new TransformStream();
  resp && resp.body!.pipeTo(writable);

  return new Response(readable, { status: 200 });
}
