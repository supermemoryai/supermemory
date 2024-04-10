import { GenerativeModel } from '@google/generative-ai';
import { OpenAIEmbeddings } from '../OpenAIEmbedder';
import { CloudflareVectorizeStore } from '@langchain/cloudflare';
import { Request } from '@cloudflare/workers-types';

export async function POST(request: Request, _: CloudflareVectorizeStore, embeddings: OpenAIEmbeddings, model: GenerativeModel, env?: Env) {
	const body = (await request.json()) as {
		query: string;
	};

	if (!body.query) {
		return new Response(JSON.stringify({ message: 'Invalid Page Content' }), { status: 400 });
	}

	const prompt = `You are an agent that answers a question based on the query. don't say 'based on the context'.\n\n Context:\n${body.query} \nAnswer this question based on the context. Question: ${body.query}\nAnswer:`;
	const output = await model.generateContentStream(prompt);

	const response = new Response(
		new ReadableStream({
			async start(controller) {
				const converter = new TextEncoder();
				for await (const chunk of output.stream) {
					const chunkText = await chunk.text();
					console.log(chunkText);
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
