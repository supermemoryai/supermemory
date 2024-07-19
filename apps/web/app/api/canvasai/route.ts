import type { NextRequest } from "next/server";
import { ensureAuth } from "../ensureAuth";

export const runtime = "edge";

export async function POST(request: NextRequest) {
	const session = await ensureAuth(request);
	if (!session) {
		return new Response("Unauthorized", { status: 401 });
	}
	const res: { query: string } = await request.json();

	try {
		const resp = await fetch(
			`${process.env.BACKEND_BASE_URL}/api/search?query=${res.query}&user=${session.user.id}`,
		);
		if (resp.status !== 200 || !resp.ok) {
			const errorData = await resp.text();
			console.log(errorData);
			return new Response(
				JSON.stringify({ message: "Error in CF function", error: errorData }),
				{ status: resp.status },
			);
		}
		return new Response(
			JSON.stringify({ response: await resp.json(), status: 200 }),
		);
	} catch (error) {
		return new Response(`Error, ${error}`);
	}
}
