import { type NextRequest } from "next/server";
import { addFromAPIType } from "@repo/shared-types";
import { ensureAuth } from "../ensureAuth";
import { createMemoryFromAPI } from "./helper";
import { getRawTweet } from "@repo/shared-types/utils";

export const runtime = "edge";

export async function POST(req: NextRequest) {
	const session = await ensureAuth(req);

	if (!session) {
		return new Response("Unauthorized", { status: 401 });
	}

	if (!process.env.BACKEND_SECURITY_KEY) {
		return new Response("Missing BACKEND_SECURITY_KEY", { status: 500 });
	}

	let body;

	try {
		body = await req.json();
	} catch (e) {
		const error = (e as Error).message;

		console.log(error);

		const tryJson = getRawTweet(await req.text());
		console.log(tryJson);

		if (tryJson) {
			try {
				body = JSON.parse(tryJson);
			} catch (e) {
				console.log(e);
				return new Response(
					JSON.stringify({
						message: "Raw found but not json?" + error,
					}),
					{
						status: 400,
					},
				);
			}
		} else {
			return new Response(
				JSON.stringify({
					message: "Raw not found & not json." + error,
				}),
				{
					status: 400,
				},
			);
		}
	}

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
