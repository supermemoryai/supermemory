import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { sessions, users } from "@/server/db/schema";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { ChatHistory } from "../../../../types/memory";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const token =
    req.cookies.get("next-auth.session-token")?.value ??
    req.cookies.get("__Secure-authjs.session-token")?.value ??
    req.cookies.get("authjs.session-token")?.value ??
    req.headers.get("Authorization")?.replace("Bearer ", "");

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

  const query = new URL(req.url).searchParams.get("q");
  const spaces = new URL(req.url).searchParams.get("spaces");

  const sourcesOnly =
    new URL(req.url).searchParams.get("sourcesOnly") ?? "false";

  const chatHistory = (await req.json()) as {
    chatHistory: ChatHistory[];
  };

  console.log("CHathistory", chatHistory);

  if (!query) {
    return new Response(JSON.stringify({ message: "Invalid query" }), {
      status: 400,
    });
  }

  const resp = await fetch(
    `https://cf-ai-backend.dhravya.workers.dev/chat?q=${query}&user=${session.user.email ?? session.user.name}&sourcesOnly=${sourcesOnly}&spaces=${spaces}`,
    {
      headers: {
        "X-Custom-Auth-Key": env.BACKEND_SECURITY_KEY,
      },
      method: "POST",
      body: JSON.stringify({
        chatHistory: chatHistory.chatHistory ?? [],
      }),
    },
  );

  console.log(resp.status);
  console.log(resp.statusText);

  if (resp.status !== 200 || !resp.ok) {
    const errorData = await resp.json();
    console.log(errorData);
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
