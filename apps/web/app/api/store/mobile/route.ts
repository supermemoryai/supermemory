import { NextRequest } from "next/server";
import { z } from "zod";
import { ensureAuth } from "../../ensureAuth";

export const runtime = "edge";

const vectorBody = z.object({
	spaces: z.array(z.number()).optional(),
	url: z.string(),
});

export async function POST(req: NextRequest) {
	const session = await ensureAuth(req);

	if (!session) {
		return new Response("Unauthorized", { status: 401 });
	}

	try {
		const body = await req.json();
		const validatedBody = vectorBody.parse(body);
		const vectorSaveResponses = await fetch(
			`${process.env.BACKEND_BASE_URL}/api/add`,
			{
				method: "POST",
				body: JSON.stringify({
					url: validatedBody.url,
					spaces: validatedBody.spaces,
					user: session.user.id,
				}),
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer " + process.env.BACKEND_SECURITY_KEY,
				},
			},
		);
		const response = (await vectorSaveResponses.json()) as {
			status: string;
			message?: string;
		};

		if (response.status !== "ok") {
			return new Response("Internal server error", { status: 500 });
		}

		if (response.status === "ok") {
			return new Response("Added to queue", { status: 200 });
		}
	} catch (e) {
		return new Response("Bad Request", { status: 400 });
	}
}
