import { type NextRequest } from "next/server";
import { createMemoryFromAPI } from "../helper";

type FriendData = {
	id: string;
	created_at: string;
	transcript: string;
	structured: {
		title: string;
		overview: string;
		action_items: [
			{
				description: string;
			},
		];
	};
};

export async function POST(req: NextRequest) {
	const body: FriendData = await req.json();

	const userId = new URL(req.url).searchParams.get("uid");

	if (!userId) {
		return new Response(
			JSON.stringify({ status: 400, body: "Missing user ID" }),
		);
	}

	await createMemoryFromAPI({
		data: {
			title: "Friend: " + body.structured.title,
			description: body.structured.overview,
			pageContent:
				body.transcript + "\n\n" + JSON.stringify(body.structured.action_items),
			spaces: [],
			type: "note",
			url: "https://basedhardware.com",
		},
		userId: userId,
	});

	return new Response(JSON.stringify({ status: 200, body: "success" }));
}
