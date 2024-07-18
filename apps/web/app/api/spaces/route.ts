import { db } from "@/server/db";
import { space } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { ensureAuth } from "../ensureAuth";
import { z } from "zod";

export const runtime = "edge";

export async function GET(req: NextRequest) {
	const session = await ensureAuth(req);

	if (!session) {
		return new Response("Unauthorized", { status: 401 });
	}

	const spaces = await db
		.select()
		.from(space)
		.where(eq(space.user, session.user.id))
		.all();

	// We want to slowly move away from this pattern and return `new Response` directly
	return NextResponse.json(
		{
			message: "OK",
			data: spaces,
		},
		{ status: 200 },
	);
}

export async function POST(req: NextRequest) {
	const session = await ensureAuth(req);

	if (!session) {
		return new Response("Unauthorized", { status: 401 });
	}

	const expectedInput = z.object({
		name: z.string(),
	});

	const jsonRequest = await req.json();

	const validated = expectedInput.safeParse(jsonRequest);
	if (!validated.success) {
		return new Response(
			JSON.stringify({ success: false, error: validated.error }),
			{
				status: 400,
			},
		);
	}

	const newSpace = await db.insert(space).values({
		name: validated.data.name,
		createdAt: new Date(),
		user: session.user.id,
	});

	return new Response(JSON.stringify({ success: true, data: newSpace }), {
		status: 200,
	});
}

export const DELETE = async (req: NextRequest) => {
	const session = await ensureAuth(req);

	if (!session) {
		return new Response("Unauthorized", { status: 401 });
	}

	const url = new URL(req.url);
	const spaceId = url.searchParams.get("space");

	if (!spaceId) {
		return new Response("Invalid space id", { status: 400 });
	}

	await db.delete(space).where(eq(space.id, parseInt(spaceId)));

	return new Response(JSON.stringify({ success: true }), { status: 200 });
};
