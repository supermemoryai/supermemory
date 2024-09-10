import { db } from "@/server/db";
import { storedContent } from "@repo/db/schema";
import { eq, gt } from "drizzle-orm";
import { ensureAuth } from "../ensureAuth";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
	const session = await ensureAuth(req);

	if (!session) {
		return new Response("Unauthorized", { status: 401 });
	}
	const lastFetchTimestamp = req.nextUrl.searchParams.get("lastFetchTimestamp");

	if (!lastFetchTimestamp) {
		return NextResponse.json(
			{ error: "Missing required parameters" },
			{ status: 400 },
		);
	}

	if (!lastFetchTimestamp) {
		return NextResponse.json(
			{ error: "Missing required parameters" },
			{ status: 400 },
		);
	}

	try {
		const newMemories = await db.query.storedContent.findMany({
			where: (content) =>
				eq(content.userId, session.user.id) &&
				gt(content.savedAt, new Date(lastFetchTimestamp)),
		});

		return NextResponse.json({ newMemories });
	} catch (error) {
		console.error("Error fetching new memories:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
