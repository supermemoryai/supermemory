import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { sessions, storedContent, userStoredContent, users } from "@/server/db/schema";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { getMetaData } from "@/server/helpers";

export const runtime = "edge";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("next-auth.session-token")?.value ?? req.cookies.get("__Secure-authjs.session-token")?.value ?? req.cookies.get("authjs.session-token")?.value ?? req.headers.get("Authorization")?.replace("Bearer ", "");

    if (!token) {
        return new Response(JSON.stringify({ message: "Invalid Key, session not found." }), { status: 404 });
    }

    const sessionData = await db.select().from(sessions).where(eq(sessions.sessionToken, token!))

    if (!sessionData || sessionData.length === 0) {
        return new Response(JSON.stringify({ message: "Invalid Key, session not found." }), { status: 404 });
    }

    const user = await db.select().from(users).where(eq(users.id, sessionData[0].userId)).limit(1)

    if (!user || user.length === 0) {
        return NextResponse.json({ message: "Invalid Key, session not found." }, { status: 404 });
    }

    const session = { session: sessionData[0], user: user[0] }

    const data = await req.json() as {
        pageContent: string,
        url: string,
    };

    const metadata = await getMetaData(data.url);


    let id: number | undefined = undefined;

    const storedCont = await db.select().from(storedContent).where(eq(storedContent.url, data.url)).limit(1)

    if (storedCont.length > 0) {
        id = storedCont[0].id;
    } else {
        const storedContentId = await db.insert(storedContent).values({
            content: data.pageContent,
            title: metadata.title,
            description: metadata.description,
            url: data.url,
            baseUrl: metadata.baseUrl,
            image: metadata.image,
            savedAt: new Date()
        })

        id = storedContentId.meta.last_row_id;
    }

    try {
        await db.insert(userStoredContent).values({
            userId: session.user.id,
            contentId: id
        });
    } catch (e) {
        console.log(e);
    }

    const res = await Promise.race([
        fetch("https://cf-ai-backend.dhravya.workers.dev/add", {
            method: "POST",
            headers: {
                "X-Custom-Auth-Key": env.BACKEND_SECURITY_KEY,
            },
            body: JSON.stringify({ ...data, user: session.user.email }),
        }),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), 40000)
        )
    ]) as Response

    const _ = await res.text();

    if (res.status !== 200) {
        return NextResponse.json({ message: "Error", error: "Error in CF function" }, { status: 500 });
    }

    return NextResponse.json({ message: "OK", data: "Success" }, { status: 200 });
}