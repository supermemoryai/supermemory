import { GenerativeModel } from '@google/generative-ai';
import { OpenAIEmbeddings } from '../OpenAIEmbedder';
import { CloudflareVectorizeStore } from '@langchain/cloudflare';
import { Request } from '@cloudflare/workers-types';

export async function GET(request: Request, _: CloudflareVectorizeStore, embeddings: OpenAIEmbeddings, model: GenerativeModel, env?: Env) {
	const queryparams = new URL(request.url).searchParams;
	const query = queryparams.get('q');
	const topK = parseInt(queryparams.get('topK') ?? '5');
	const user = queryparams.get('user');
	const space = queryparams.get('space');

	const sourcesOnly = queryparams.get('sourcesOnly') ?? 'false';

	if (!user) {
		return new Response(JSON.stringify({ message: 'Invalid User' }), { status: 400 });
	}

	if (!query) {
		return new Response(JSON.stringify({ message: 'Invalid Query' }), { status: 400 });
	}

	const filter: VectorizeVectorMetadataFilter = {
		user,
	};

	if (space) {
		filter.space;
	}

	const queryAsVector = await embeddings.embedQuery(query);

	const resp = await env!.VECTORIZE_INDEX.query(queryAsVector, {
		topK,
		filter,
	});

	if (resp.count === 0) {
		return new Response(JSON.stringify({ message: 'No Results Found' }), { status: 404 });
	}

	const highScoreIds = resp.matches.filter(({ score }) => score > 0.3).map(({ id }) => id);

	if (sourcesOnly === 'true') {
		const idsAsStrings = highScoreIds.map(String);

		const storedContent = await Promise.all(
			idsAsStrings.map(async (id) => {
				const stored = await env!.KV.get(id);
				if (stored) {
					return stored;
				}
				return id;
			}),
		);

		console.log(storedContent);
		return new Response(JSON.stringify({ ids: storedContent }), { status: 200 });
	}

	const vec = await env!.VECTORIZE_INDEX.getByIds(highScoreIds);

	if (vec.length === 0 || !vec[0].metadata) {
		return new Response(JSON.stringify({ message: 'No Results Found' }), { status: 400 });
	}

	const preparedContext = vec
		.slice(0, 3)
		.map(
			({ metadata }) =>
				`Website title: ${metadata!.title}\nDescription: ${metadata!.description}\nURL: ${metadata!.url}\nContent: ${metadata!.text}`,
		)
		.join('\n\n');

	const prompt = `You are an agent that summarizes a page based on the query. Be direct and concise, don't say 'based on the context'.\n\n Context:\n${preparedContext} \nAnswer this question based on the context. Question: ${query}\nAnswer:`;
	const output = await model.generateContentStream(prompt);

	const response = new Response(
		new ReadableStream({
			async start(controller) {
				const converter = new TextEncoder();
				for await (const chunk of output.stream) {
					const chunkText = await chunk.text();
					const encodedChunk = converter.encode('data: ' + JSON.stringify({ response: chunkText }) + '\n\n');
					controller.enqueue(encodedChunk);
				}
				const doneChunk = converter.encode('data: [DONE]');
				controller.enqueue(doneChunk);
				controller.close();
			},
		}),
	);
	return response;
}
