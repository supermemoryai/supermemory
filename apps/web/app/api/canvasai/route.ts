import type { NextRequest } from "next/server";
import { ensureAuth } from "../ensureAuth";
import { SourcesFromApi } from "@repo/shared-types";

export const runtime = "edge";


export async function POST(req: NextRequest) {
	const session = await ensureAuth(req);

	if (!session) {
		return new Response("Unauthorized", { status: 401 });
	}

  const res: { query: string } = await req.json();

	const response = await fetch(
		`${process.env.BACKEND_BASE_URL}/api/chat?query=${res.query}&user=${session.user.id}&sourcesOnly=true`,
		{
			headers: {
				Authorization: `Bearer ${process.env.BACKEND_SECURITY_KEY}`,
				"Content-Type": "application/json",
			},
			method: "POST",
			body: JSON.stringify({})
		}
	)

	const data = (await response.json()) as SourcesFromApi;
	console.log(data);
	return new Response(JSON.stringify(data), { status: 200 });
}