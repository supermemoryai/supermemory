import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { sessions, users } from "@/server/db/schema";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("next-auth.session-token")?.value ?? req.headers.get("Authorization")?.replace("Bearer ", "");

        const session = await db.select().from(sessions).where(eq(sessions.sessionToken, token!))
            .leftJoin(users, eq(sessions.userId, users.id))

        if (!session || session.length === 0) {
            return NextResponse.json({ message: "Invalid Key, session not found." }, { status: 404 });
        }

        return NextResponse.json({ message: "OK", data: session[0] }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Error", error }, { status: 500 });
    }
}