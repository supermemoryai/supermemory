import type { VectorizeIndex, Fetcher, Request } from '@cloudflare/workers-types';

import { CloudflareVectorizeStore } from '@langchain/cloudflare';
import { OpenAIEmbeddings } from './OpenAIEmbedder';
import { GoogleGenerativeAI } from '@google/generative-ai';
import routeMap from './routes';
import { queue } from './routes/queue';

function isAuthorized(request: Request, env: Env): boolean {
	return request.headers.get('X-Custom-Auth-Key') === env.SECURITY_KEY;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		if (!isAuthorized(request, env)) {
			return new Response('Unauthorized', { status: 401 });
		}

		const embeddings = new OpenAIEmbeddings({
			apiKey: env.OPENAI_API_KEY,
			modelName: 'text-embedding-3-small',
		});

		const store = new CloudflareVectorizeStore(embeddings, {
			index: env.VECTORIZE_INDEX,
		});

		const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);

		const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

		const url = new URL(request.url);
		const path = url.pathname;
		const method = request.method.toUpperCase();

		const routeHandlers = routeMap.get(path);

		if (!routeHandlers) {
			return new Response('Not Found', { status: 404 });
		}

		const handler = routeHandlers[method];

		if (!handler) {
			return new Response('Method Not Allowed', { status: 405 });
		}
		return await handler(request, store, embeddings, model, env, ctx);
	},
	queue,
};
