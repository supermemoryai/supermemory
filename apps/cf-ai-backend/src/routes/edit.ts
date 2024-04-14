import { Request } from '@cloudflare/workers-types';
import { type CloudflareVectorizeStore } from '@langchain/cloudflare';
import { OpenAIEmbeddings } from '../OpenAIEmbedder';
import { GenerativeModel } from '@google/generative-ai';
import { seededRandom } from '../util';

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

	const { searchParams } = new URL(request.url);
	const uniqueUrl = searchParams.get('uniqueUrl');

	const toBeDeleted = `${uniqueUrl}-${body.user}`;
	const tbduuid = await env.KV.get(toBeDeleted);
	if (tbduuid) {
		await store.delete({ ids: [tbduuid] });
	}

	// TODO: FIX THIS,BUT TEMPERORILY TRIM page content to 1000 words
	body.pageContent = body.pageContent.split(' ').slice(0, 1000).join(' ');

	const newPageContent = `Title: ${body.title}\nDescription: ${body.description}\nURL: ${body.url}\nContent: ${body.pageContent}`;

	const ourID = `${body.url}-${body.user}`;

	const random = seededRandom(ourID);
	const uuid = random().toString(36).substring(2, 15) + random().toString(36).substring(2, 15);

	await env.KV.put(uuid, ourID);

	await store.addDocuments(
		[
			{
				pageContent: newPageContent,
				metadata: {
					title: body.title?.slice(0, 50) ?? '',
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
