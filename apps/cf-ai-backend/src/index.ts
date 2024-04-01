import type {
	VectorizeIndex,
	Fetcher,
	Request,
} from "@cloudflare/workers-types";

import {
	CloudflareVectorizeStore,
} from "@langchain/cloudflare";
import { OpenAIEmbeddings } from "./OpenAIEmbedder";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface Env {
	VECTORIZE_INDEX: VectorizeIndex;
	AI: Fetcher;
	SECURITY_KEY: string;
	OPENAI_API_KEY: string;
	GOOGLE_AI_API_KEY: string;
}


function isAuthorized(request: Request, env: Env): boolean {
	return request.headers.get('X-Custom-Auth-Key') === env.SECURITY_KEY;
}

export default {
	async fetch(request: Request, env: Env) {
		if (!isAuthorized(request, env)) {
			return new Response('Unauthorized', { status: 401 });
		}

		const pathname = new URL(request.url).pathname;
		const embeddings = new OpenAIEmbeddings({
			apiKey: env.OPENAI_API_KEY,
			modelName: 'text-embedding-3-small',
		});

		const store = new CloudflareVectorizeStore(embeddings, {
			index: env.VECTORIZE_INDEX,
		});

		const genAI = new GoogleGenerativeAI(env.GOOGLE_AI_API_KEY);
		const model = genAI.getGenerativeModel({ model: "gemini-pro" });

		// TODO: Add /chat endpoint to chat with the AI in a conversational manner
		if (pathname === "/add" && request.method === "POST") {

			const body = await request.json() as {
				pageContent: string,
				title?: string,
				description?: string,
				url: string,
				user: string
			};


			if (!body.pageContent || !body.url) {
				return new Response(JSON.stringify({ message: "Invalid Page Content" }), { status: 400 });
			}
			const newPageContent = `Title: ${body.title}\nDescription: ${body.description}\nURL: ${body.url}\nContent: ${body.pageContent}`


			await store.addDocuments([
				{
					pageContent: newPageContent,
					metadata: {
						title: body.title ?? "",
						description: body.description ?? "",
						url: body.url,
						user: body.user,
					},
				},
			], {
				ids: [`${body.url}`]
			})

			return new Response(JSON.stringify({ message: "Document Added" }), { status: 200 });
		}

		else if (pathname === "/query" && request.method === "GET") {
			const queryparams = new URL(request.url).searchParams;
			const query = queryparams.get("q");
			const topK = parseInt(queryparams.get("topK") ?? "5");
			const user = queryparams.get("user")

			const sourcesOnly = (queryparams.get("sourcesOnly") ?? "false")

			if (!user) {
				return new Response(JSON.stringify({ message: "Invalid User" }), { status: 400 });
			}

			if (!query) {
				return new Response(JSON.stringify({ message: "Invalid Query" }), { status: 400 });
			}

			const filter: VectorizeVectorMetadataFilter = {
				user: {
					$eq: user
				}
			}

			const queryAsVector = await embeddings.embedQuery(query);

			const resp = await env.VECTORIZE_INDEX.query(queryAsVector, {
				topK,
				filter
			});

			if (resp.count === 0) {
				return new Response(JSON.stringify({ message: "No Results Found" }), { status: 400 });
			}

			const highScoreIds = resp.matches.filter(({ score }) => score > 0.3).map(({ id }) => id)

			if (sourcesOnly === "true") {
				return new Response(JSON.stringify({ ids: highScoreIds }), { status: 200 });
			}

			const vec = await env.VECTORIZE_INDEX.getByIds(highScoreIds)

			if (vec.length === 0 || !vec[0].metadata) {
				return new Response(JSON.stringify({ message: "No Results Found" }), { status: 400 });
			}

			const preparedContext = vec.slice(0, 3).map(({ metadata }) => `Website title: ${metadata!.title}\nDescription: ${metadata!.description}\nURL: ${metadata!.url}\nContent: ${metadata!.text}`).join("\n\n");

			const prompt = `You are an agent that summarizes a page based on the query. Be direct and concise, don't say 'based on the context'.\n\n Context:\n${preparedContext} \nAnswer this question based on the context. Question: ${query}\nAnswer:`
			const output = await model.generateContentStream(prompt);

			const response = new Response(
				new ReadableStream({
					async start(controller) {
						const converter = new TextEncoder();
						for await (const chunk of output.stream) {
							const chunkText = await chunk.text();
							const encodedChunk = converter.encode("data: " + JSON.stringify({ "response": chunkText }) + "\n\n");
							controller.enqueue(encodedChunk);
						}
						const doneChunk = converter.encode("data: [DONE]");
						controller.enqueue(doneChunk);
						controller.close();
					}
				})
			);
			return response;
		}

		else if (pathname === "/ask" && request.method === "POST") {
			const body = await request.json() as {
				query: string
			};

			if (!body.query) {
				return new Response(JSON.stringify({ message: "Invalid Page Content" }), { status: 400 });
			}

			const prompt = `You are an agent that answers a question based on the query. Be direct and concise, don't say 'based on the context'.\n\n Context:\n${body.query} \nAnswer this question based on the context. Question: ${body.query}\nAnswer:`
			const output = await model.generateContentStream(prompt);

			const response = new Response(
				new ReadableStream({
					async start(controller) {
						const converter = new TextEncoder();
						for await (const chunk of output.stream) {
							const chunkText = await chunk.text();
							console.log(chunkText);
							const encodedChunk = converter.encode("data: " + JSON.stringify({ "response": chunkText }) + "\n\n");
							controller.enqueue(encodedChunk);
						}
						const doneChunk = converter.encode("data: [DONE]");
						controller.enqueue(doneChunk);
						controller.close();
					}
				})
			);
			return response;
		}

		return new Response(JSON.stringify({ message: "Invalid Request" }), { status: 400 });

	},
};
