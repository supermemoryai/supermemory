import { type NextRequest } from "next/server";
import { ChatHistory } from "@repo/shared-types";
import { ensureAuth } from "../ensureAuth";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const session = await ensureAuth(req);

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!process.env.BACKEND_SECURITY_KEY) {
    return new Response("Missing BACKEND_SECURITY_KEY", { status: 500 });
  }

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

  try {
    const resp = await fetch(
      `https://cf-ai-backend.dhravya.workers.dev/chat?q=${query}&user=${session.user.email ?? session.user.name}&sourcesOnly=${sourcesOnly}&spaces=${spaces}`,
      {
        headers: {
          "X-Custom-Auth-Key": process.env.BACKEND_SECURITY_KEY!,
        },
        method: "POST",
        body: JSON.stringify({
          chatHistory: chatHistory.chatHistory ?? [],
        }),
      },
    );

    console.log("sourcesOnly", sourcesOnly);

    if (sourcesOnly == "true") {
      const data = await resp.json();
      console.log("data", data);
      return new Response(JSON.stringify(data), { status: 200 });
    }

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
  } catch {}
}
