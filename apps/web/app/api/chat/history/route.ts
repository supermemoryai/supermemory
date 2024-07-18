import { NextRequest } from "next/server";
import { ensureAuth } from "../../ensureAuth";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import { chatThreads } from "@/server/db/schema";

export const runtime = "edge";

export async function GET(req: NextRequest) {
	const session = await ensureAuth(req);

	if (!session) {
		return new Response("Unauthorized", { status: 401 });
	}

	if (!process.env.BACKEND_SECURITY_KEY) {
		return new Response("Missing BACKEND_SECURITY_KEY", { status: 500 });
	}

	try {
		const chatHistorys = await db.query.chatThreads.findMany({
			where: eq(chatThreads.userId, session.user.id),
		});

		return new Response(JSON.stringify({ success: true, data: chatHistorys }), {
			status: 200,
		});
	} catch (e) {
		return new Response(
			JSON.stringify({
				success: false,
				error: (e as Error).message,
			}),
			{ status: 400 },
		);
	}
}
