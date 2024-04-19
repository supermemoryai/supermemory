import { Content, GenerativeModel } from '@google/generative-ai';
import { OpenAIEmbeddings } from '../OpenAIEmbedder';
import { CloudflareVectorizeStore } from '@langchain/cloudflare';
import { Request } from '@cloudflare/workers-types';

export async function POST(request: Request, _: CloudflareVectorizeStore, embeddings: OpenAIEmbeddings, model: GenerativeModel, env?: Env) {
	const queryparams = new URL(request.url).searchParams;
	const query = queryparams.get('q');
	const topK = parseInt(queryparams.get('topK') ?? '5');
	const user = queryparams.get('user');
	const spaces = queryparams.get('spaces') ?? undefined;
	const sp = spaces === 'null' ? undefined : spaces;
	const spacesArray = sp ? sp.split(',') : undefined;

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

	const responses: VectorizeMatches = { matches: [], count: 0 };

	if (spacesArray) {
		for (const space of spacesArray) {
			filter.space = space;

			const queryAsVector = await embeddings.embedQuery(query);

			const resp = await env!.VECTORIZE_INDEX.query(queryAsVector, {
				topK,
				filter,
			});

			if (resp.count > 0) {
				responses.matches.push(...resp.matches);
				responses.count += resp.count;
			}
		}
	} else {
		const queryAsVector = await embeddings.embedQuery(query);
		const resp = await env!.VECTORIZE_INDEX.query(queryAsVector, {
			topK,
			filter: {
				user,
			},
		});

		if (resp.count > 0) {
			responses.matches.push(...resp.matches);
			responses.count += resp.count;
		}
	}

	// if (responses.count === 0) {
	// 	return new Response(JSON.stringify({ message: "No Results Found" }), { status: 404 });
	// }

	const highScoreIds = responses.matches.filter(({ score }) => score > 0.3).map(({ id }) => id);

	console.log('highscoreIds', highScoreIds);

	if (sourcesOnly === 'true') {
		// Try await env.KV.get(id) for each id in a Promise.all
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

	const preparedContext = vec
		.map(
			({ metadata }) =>
				`Website title: ${metadata!.title}\nDescription: ${metadata!.description}\nURL: ${metadata!.url}\nContent: ${metadata!.text}`,
		)
		.join('\n\n');

	const body = (await request.json()) as {
		chatHistory?: Content[];
	};

	const defaultHistory = [
		{
			role: 'user',
			parts: [
				{
					text: `You are an agent that summarizes a page based on the query. don't say 'based on the context'. I expect you to be like a 'Second Brain'. you will be provided with the context (old saved posts) and questions. Answer accordingly. Answer in markdown format`,
				},
			],
		},
		{
			role: 'model',
			parts: [{ text: "Ok, I am a personal assistant, and will act as a second brain to help with user's queries." }],
		},
	] as Content[];

	const chat = model.startChat({
		history: [...defaultHistory, ...(body.chatHistory ?? [])],
	});

	const prompt =
		`You are supermemory - an agent that answers a question based on the context provided. don't say 'based on the context'. Be concise and to the point, make sure that you are addressing the question properly but don't yap too much. I expect you to be like a 'Second Brain'. you will be provided with the context (old saved posts) and questions. Answer accordingly. Answer in markdown format. Use bold, italics, bullet points` +
		`Context:\n${preparedContext == '' ? "No context, just introduce yourself and say something like 'I don't know, but you can save things from the sidebar on the right and then query me'" : preparedContext + `Question: ${query}\nAnswer:`}\n\n`;

	const output = await chat.sendMessageStream(prompt);

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
