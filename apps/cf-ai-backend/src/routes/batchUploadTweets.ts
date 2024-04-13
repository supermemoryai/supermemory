import { Request } from '@cloudflare/workers-types';
import { type CloudflareVectorizeStore } from '@langchain/cloudflare';
import { OpenAIEmbeddings } from '../OpenAIEmbedder';
import { GenerativeModel } from '@google/generative-ai';

export async function POST(request: Request, store: CloudflareVectorizeStore, _: OpenAIEmbeddings, m: GenerativeModel, env: Env) {
	const body = (await request.json()) as TweetData[] | undefined;

	if (!body) {
		return new Response(JSON.stringify({ message: 'Body is missing' }), { status: 400 });
	}

	const bytes = new TextEncoder().encode(JSON.stringify(body)).length;

	if (bytes < 128000) {
		await env.MY_QUEUE.send(body);
	} else {
		let bytesTillNow = 0;
		let batches: TweetData[] = [];

		const getByteLength = (data: string) => new TextEncoder().encode(data).length;

		for (let i = 0; i < body.length; i++) {
			const byteLength = getByteLength(JSON.stringify(body[i]));

			if (bytesTillNow + byteLength < 100000) {
				bytesTillNow += byteLength;
				batches.push(body[i]);
			} else {
				await env.MY_QUEUE.send(batches);
				batches = [body[i]];
				bytesTillNow = byteLength;
			}
		}
	}

	return new Response(JSON.stringify({ message: 'Document Added' }), { status: 200 });
}
