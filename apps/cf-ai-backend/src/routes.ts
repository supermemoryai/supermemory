import { CloudflareVectorizeStore } from '@langchain/cloudflare';
import * as apiAdd from './routes/add';
import * as apiQuery from './routes/query';
import * as apiAsk from './routes/ask';
import * as apiChat from './routes/chat';
import { OpenAIEmbeddings } from './OpenAIEmbedder';
import { GenerativeModel } from '@google/generative-ai';
import { Request } from '@cloudflare/workers-types';

type RouteHandler = (
	request: Request,
	store: CloudflareVectorizeStore,
	embeddings: OpenAIEmbeddings,
	model: GenerativeModel,
	env: Env,
	ctx?: ExecutionContext,
) => Promise<Response>;

const routeMap = new Map<string, Record<string, RouteHandler>>();

routeMap.set('/add', apiAdd);

routeMap.set('/query', apiQuery);

routeMap.set('/ask', apiAsk);

routeMap.set('/chat', apiChat);

// Add more route mappings as needed
// routeMap.set('/api/otherRoute', { ... });

export default routeMap;
