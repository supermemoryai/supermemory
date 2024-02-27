import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { sessions, users } from "@/server/db/schema";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";

export const runtime = "edge";

export async function GET(req: NextRequest) {
    const token = req.cookies.get("next-auth.session-token")?.value ?? req.cookies.get("__Secure-authjs.session-token")?.value ?? req.cookies.get("authjs.session-token")?.value ?? req.headers.get("Authorization")?.replace("Bearer ", "");

    const session = await db.select().from(sessions).where(eq(sessions.sessionToken, token!))
        .leftJoin(users, eq(sessions.userId, users.id)).limit(1)

    if (!session || session.length === 0) {
        return NextResponse.json({ message: "Invalid Key, session not found." }, { status: 404 });
    }

    return new Response(JSON.stringify({ message: "OK", data: session }), { status: 200 });
}