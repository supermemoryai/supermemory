import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { eq } from "drizzle-orm";
import {
	chatThreads,
	contentToSpace,
	storedContent,
	users,
} from "@/server/db/schema";
import { ensureAuth } from "../ensureAuth";

export const runtime = "edge";

export async function GET(req: NextRequest) {
	const session = await ensureAuth(req);

	if (!session) {
		return new Response("Unauthorized", { status: 401 });
	}

	if (!process.env.BACKEND_SECURITY_KEY) {
		return new Response("Missing BACKEND_SECURITY_KEY", { status: 500 });
	}

	const url = new URL(req.url);

	const spaceId = url.searchParams.get("space");

	try {
		if (spaceId) {
			const memories = await db
				.select({
					id: storedContent.id,
					content: storedContent.content,
					title: storedContent.title,
					description: storedContent.description,
					url: storedContent.url,
					savedAt: storedContent.savedAt,
					baseUrl: storedContent.baseUrl,
					ogImage: storedContent.ogImage,
					type: storedContent.type,
					image: storedContent.image,
					userId: storedContent.userId,
					noteId: storedContent.noteId,
				})
				.from(storedContent)
				.innerJoin(
					contentToSpace,
					eq(storedContent.id, contentToSpace.contentId),
				)
				.where(eq(contentToSpace.spaceId, parseInt(spaceId)));

			return new Response(
				JSON.stringify({
					success: true,
					data: { memories: memories },
				}),
				{ status: 200 },
			);
		}

		const spaces = await db.query.space.findMany({
			where: eq(users, session.user.id),
		});

		const memories = await db.query.storedContent.findMany({
			where: eq(users, session.user.id),
		});

		return new Response(
			JSON.stringify({
				success: true,
				data: { spaces: spaces, memories: memories },
			}),
		);
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
