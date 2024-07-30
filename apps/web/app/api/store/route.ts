import { type NextRequest } from "next/server";
import { addFromAPIType } from "@repo/shared-types";
import { ensureAuth } from "../ensureAuth";
import { createMemoryFromAPI } from "./helper";

export const runtime = "edge";

export async function POST(req: NextRequest) {
	const session = await ensureAuth(req);

	if (!session) {
		return new Response("Unauthorized", { status: 401 });
	}

	if (!process.env.BACKEND_SECURITY_KEY) {
		return new Response("Missing BACKEND_SECURITY_KEY", { status: 500 });
	}

	const body = await req.json();

	const validated = addFromAPIType.safeParse(body);

	if (!validated.success) {
		return new Response(
			JSON.stringify({
				message: "Invalid request",
				error: validated.error,
			}),
			{ status: 400 },
		);
	}

	const data = validated.data;

	const result = await createMemoryFromAPI({
		data,
		userId: session.user.id,
	});

	if (!result.success) {
		return new Response(
			JSON.stringify({
				message: "Failed to save document",
				error: result.error,
			}),
			{ status: 501 },
		);
	}

	return new Response(
		JSON.stringify({
			message: "Document saved",
			data: result.data,
		}),
		{ status: 200 },
	);
}
