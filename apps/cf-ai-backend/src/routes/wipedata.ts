import { Request } from '@cloudflare/workers-types';
import { type CloudflareVectorizeStore } from '@langchain/cloudflare';
import { OpenAIEmbeddings } from '../OpenAIEmbedder';
import { GenerativeModel } from '@google/generative-ai';
import { seededRandom } from '../util';

// TODO: Waiting for cloudflare to implement tojson so i can get all IDS for that user and delete them
export async function DELETE(request: Request, store: CloudflareVectorizeStore, _: OpenAIEmbeddings, m: GenerativeModel, env: Env) {
	const { searchParams } = new URL(request.url);
	const user = searchParams.get('user');

	console.log(store.toJSONNotImplemented());

	// for (const match of matches.matches) {
	// 	await store.delete({ ids: [match.id] });
	// }

	return new Response(JSON.stringify({ message: 'Document deleted' }), { status: 200 });
}
