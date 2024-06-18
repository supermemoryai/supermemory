import type { NextRequest } from "next/server";
import { ensureAuth } from "../ensureAuth";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const d = await ensureAuth(request);
  if (!d) {
    return new Response("Unauthorized", { status: 401 });
  }
  const res : {context: string, request: string} = await request.json()

  try {
    const response = await fetch(`${process.env.BACKEND_BASE_URL}/api/editorai?context=${res.context}&request=${res.request}`);
    const result = await response.json();
    return new Response(JSON.stringify(result));
  } catch (error) {
    return new Response(`Error, ${error}`)
  }
}