import { Request } from "@cloudflare/workers-types";
import { type CloudflareVectorizeStore } from "@langchain/cloudflare";

export async function POST(request: Request, store: CloudflareVectorizeStore) {
	const body = await request.json() as {
		pageContent: string,
		title?: string,
		description?: string,
		category?: string,
		url: string,
		user: string
	};

	if (!body.pageContent || !body.url) {
		return new Response(JSON.stringify({ message: "Invalid Page Content" }), { status: 400 });
	}
	const newPageContent = `Title: ${body.title}\nDescription: ${body.description}\nURL: ${body.url}\nContent: ${body.pageContent}`


	await store.addDocuments([
		{
			pageContent: newPageContent,
			metadata: {
				title: body.title ?? "",
				description: body.description ?? "",
				category: body.category ?? "",
				url: body.url,
				user: body.user,
			},
		},
	], {
		ids: [`${body.url}`]
	})

	return new Response(JSON.stringify({ message: "Document Added" }), { status: 200 });
}
