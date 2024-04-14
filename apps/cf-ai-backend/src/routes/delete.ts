import { Request } from '@cloudflare/workers-types';
import { type CloudflareVectorizeStore } from '@langchain/cloudflare';
import { OpenAIEmbeddings } from '../OpenAIEmbedder';
import { GenerativeModel } from '@google/generative-ai';
import { seededRandom } from '../util';

export async function DELETE(request: Request, store: CloudflareVectorizeStore, _: OpenAIEmbeddings, m: GenerativeModel, env: Env) {
	const { searchParams } = new URL(request.url);
	const websiteUrl = searchParams.get('websiteUrl');
	const user = searchParams.get('user');

	if (!websiteUrl || !user) {
		return new Response(JSON.stringify({ message: 'Invalid Request, need websiteUrl and user' }), { status: 400 });
	}

	const ourID = `${websiteUrl}-${user}`;

	const uuid = await env.KV.get(ourID);

	if (!uuid) {
		return new Response(JSON.stringify({ message: 'Document not found' }), { status: 404 });
	}

	await store.delete({ ids: [uuid] });

	return new Response(JSON.stringify({ message: 'Document deleted' }), { status: 200 });
}
