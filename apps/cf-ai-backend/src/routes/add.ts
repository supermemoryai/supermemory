import { Request } from '@cloudflare/workers-types';
import { type CloudflareVectorizeStore } from '@langchain/cloudflare';
import { OpenAIEmbeddings } from '../OpenAIEmbedder';
import { GenerativeModel } from '@google/generative-ai';

export async function POST(request: Request, store: CloudflareVectorizeStore, _: OpenAIEmbeddings, m: GenerativeModel, env: Env) {
	const body = (await request.json()) as {
		pageContent: string;
		title?: string;
		description?: string;
		space?: string;
		url: string;
		user: string;
	};

	if (!body.pageContent || !body.url) {
		return new Response(JSON.stringify({ message: 'Invalid Page Content' }), { status: 400 });
	}
	const newPageContent = `Title: ${body.title}\nDescription: ${body.description}\nURL: ${body.url}\nContent: ${body.pageContent}`;

	const ourID = `${body.url}-${body.user}`;

	// WHY? Because this helps us to prevent duplicate entries for the same URL and user
	function seededRandom(seed: string) {
		let x = [...seed].reduce((acc, cur) => acc + cur.charCodeAt(0), 0);
		return () => {
			x = (x * 9301 + 49297) % 233280;
			return x / 233280;
		};
	}

	const random = seededRandom(ourID);
	const uuid = random().toString(36).substring(2, 15) + random().toString(36).substring(2, 15);

	await env.KV.put(uuid, ourID);

	await store.addDocuments(
		[
			{
				pageContent: newPageContent,
				metadata: {
					title: body.title ?? '',
					description: body.description ?? '',
					space: body.space ?? '',
					url: body.url,
					user: body.user,
				},
			},
		],
		{
			ids: [uuid],
		},
	);

	return new Response(JSON.stringify({ message: 'Document Added' }), { status: 200 });
}
