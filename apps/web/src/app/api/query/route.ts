import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { sessions, users } from "@/server/db/schema";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export const runtime = "edge";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("next-auth.session-token")?.value ?? req.cookies.get("__Secure-authjs.session-token")?.value ?? req.cookies.get("authjs.session-token")?.value ?? req.headers.get("Authorization")?.replace("Bearer ", "");

    const sessionData = await db.select().from(sessions).where(eq(sessions.sessionToken, token!))

    if (!sessionData || sessionData.length === 0) {
        return new Response(JSON.stringify({ message: "Invalid Key, session not found." }), { status: 404 });
    }

    const user = await db.select().from(users).where(eq(users.id, sessionData[0].userId)).limit(1)

    if (!user || user.length === 0) {
        return NextResponse.json({ message: "Invalid Key, session not found." }, { status: 404 });
    }

    const session = {session: sessionData[0], user: user[0]}

    const query = new URL(req.url).searchParams.get("q");

    if (!query) {
        return new Response(JSON.stringify({ message: "Invalid query" }), { status: 400 });
    }

    const resp = await fetch(`https://cf-ai-backend.dhravya.workers.dev/query?q=${query}&user=${session.user.email ?? session.user.name}`, {
        headers: {
            "X-Custom-Auth-Key": env.BACKEND_SECURITY_KEY,
        }
    })

    const data = await resp.json()

    if (resp.status !== 200) {
        return new Response(JSON.stringify({ message: "Error in CF function", error: data }), { status: resp.status });
    }

    return new Response(JSON.stringify({ message: "OK", data: data }), { status: 200 });
}