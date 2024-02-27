import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { sessions, users } from "@/server/db/schema";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export const runtime = "edge";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("next-auth.session-token")?.value ?? req.cookies.get("__Secure-authjs.session-token")?.value ?? req.cookies.get("authjs.session-token")?.value ?? req.headers.get("Authorization")?.replace("Bearer ", "");

    console.log(token ? token : 'token not found lol')
    console.log(process.env.DATABASE)

    const session = await db.select().from(sessions).where(eq(sessions.sessionToken, token!))
        .leftJoin(users, eq(sessions.userId, users.id)).limit(1)

    if (!session || session.length === 0) {
        return NextResponse.json({ message: "Invalid Key, session not found." }, { status: 404 });
    }

    if (!session[0].user) {
        return NextResponse.json({ message: "Invalid Key, session not found." }, { status: 404 });
    }

    const data = await req.json() as {
        pageContent: string,
        title?: string,
        description?: string,
        url: string,
    };


    const resp = await fetch("https://cf-ai-backend.dhravya.workers.dev/add", {
        method: "POST",
        headers: {
            "X-Custom-Auth-Key": env.BACKEND_SECURITY_KEY,
        },
        body: JSON.stringify({ ...data, user: session[0].user.email }),
    });

    const _ = await resp.json();

    if (resp.status !== 200) {
        return NextResponse.json({ message: "Error", error: "Error in CF function" }, { status: 500 });
    }

    return NextResponse.json({ message: "OK", data: "Success" }, { status: 200 });

}