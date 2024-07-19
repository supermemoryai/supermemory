import { Context } from "hono";
import { Env, vectorObj } from "./types";
import { CloudflareVectorizeStore } from "@langchain/cloudflare";
import { OpenAIEmbeddings } from "./utils/OpenAIEmbedder";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { seededRandom } from "./utils/seededRandom";

export async function initQuery(
	c: Context<{ Bindings: Env }>,
	model: string = "gpt-4o",
) {
	const embeddings = new OpenAIEmbeddings({
		apiKey: c.env.OPENAI_API_KEY,
		modelName: "text-embedding-3-small",
	});

	const store = new CloudflareVectorizeStore(embeddings, {
		index: c.env.VECTORIZE_INDEX,
	});

	let selectedModel:
		| ReturnType<ReturnType<typeof createOpenAI>>
		| ReturnType<ReturnType<typeof createGoogleGenerativeAI>>
		| ReturnType<ReturnType<typeof createAnthropic>>;

	switch (model) {
		case "claude-3-opus":
			const anthropic = createAnthropic({
				apiKey: c.env.ANTHROPIC_API_KEY,
				baseURL:
					"https://gateway.ai.cloudflare.com/v1/47c2b4d598af9d423c06fc9f936226d5/supermemory/anthropic",
			});
			selectedModel = anthropic.chat("claude-3-opus-20240229");
			console.log("Selected model: ", selectedModel);
			break;
		case "gemini-1.5-pro":
			const googleai = createGoogleGenerativeAI({
				apiKey: c.env.GOOGLE_AI_API_KEY,
				baseURL:
					"https://gateway.ai.cloudflare.com/v1/47c2b4d598af9d423c06fc9f936226d5/supermemory/google-vertex-ai",
			});
			selectedModel = googleai.chat("models/gemini-1.5-pro-latest");
			console.log("Selected model: ", selectedModel);
			break;
		case "gpt-4o":
		default:
			const openai = createOpenAI({
				apiKey: c.env.OPENAI_API_KEY,
				baseURL:
					"https://gateway.ai.cloudflare.com/v1/47c2b4d598af9d423c06fc9f936226d5/supermemory/openai",
				compatibility: "strict",
			});
			selectedModel = openai.chat("gpt-4o-mini");
			break;
	}

	return { store, model: selectedModel };
}

export async function deleteDocument({
	url,
	user,
	c,
	store,
}: {
	url: string;
	user: string;
	c: Context<{ Bindings: Env }>;
	store: CloudflareVectorizeStore;
}) {
	const toBeDeleted = `${url}#supermemory-web`;
	const random = seededRandom(toBeDeleted);

	const uuid =
		random().toString(36).substring(2, 15) +
		random().toString(36).substring(2, 15);

	const allIds = await c.env.KV.list({ prefix: uuid });

	if (allIds.keys.length > 0) {
		const savedVectorIds = allIds.keys.map((key) => key.name);
		const vectors = await c.env.VECTORIZE_INDEX.getByIds(savedVectorIds);
		// We don't actually delete document directly, we just remove the user from the metadata.
		// If there's no user left, we can delete the document.
		const newVectors = vectors.map((vector) => {
			delete vector.metadata[`user-${user}`];

			// Get count of how many users are left
			const userCount = Object.keys(vector.metadata).filter((key) =>
				key.startsWith("user-"),
			).length;

			// If there's no user left, we can delete the document.
			// need to make sure that every chunk is deleted otherwise it would be problematic.
			if (userCount === 0) {
				store.delete({ ids: savedVectorIds });
				void Promise.all(savedVectorIds.map((id) => c.env.KV.delete(id)));
				return null;
			}

			return vector;
		});

		// If all vectors are null (deleted), we can delete the KV too. Otherwise, we update (upsert) the vectors.
		if (newVectors.every((v) => v === null)) {
			await c.env.KV.delete(uuid);
		} else {
			await c.env.VECTORIZE_INDEX.upsert(newVectors.filter((v) => v !== null));
		}
	}
}

function sanitizeKey(key: string): string {
	if (!key) throw new Error("Key cannot be empty");

	// Remove or replace invalid characters
	let sanitizedKey = key.replace(/[.$"]/g, "_");

	// Ensure key does not start with $
	if (sanitizedKey.startsWith("$")) {
		sanitizedKey = sanitizedKey.substring(1);
	}

	return sanitizedKey;
}

export async function batchCreateChunksAndEmbeddings({
	store,
	body,
	chunks,
	context,
}: {
	store: CloudflareVectorizeStore;
	body: z.infer<typeof vectorObj>;
	chunks: string[];
	context: Context<{ Bindings: Env }>;
}) {
	//! NOTE that we use #supermemory-web to ensure that
	//! If a user saves it through the extension, we don't want other users to be able to see it.
	// Requests from the extension should ALWAYS have a unique ID with the USERiD in it.
	// I cannot stress this enough, important for security.
	const ourID = `${body.url}#supermemory-web`;
	const random = seededRandom(ourID);
	const uuid =
		random().toString(36).substring(2, 15) +
		random().toString(36).substring(2, 15);

	const allIds = await context.env.KV.list({ prefix: uuid });

	let pageContent = "";
	// If some chunks for that content already exist, we'll just update the metadata to include
	// the user.
	if (allIds.keys.length > 0) {
		const savedVectorIds = allIds.keys.map((key) => key.name);
		const vectors = await context.env.VECTORIZE_INDEX.getByIds(savedVectorIds);

		// Now, we'll update all vector metadatas with one more userId and all spaceIds
		const newVectors = vectors.map((vector) => {
			vector.metadata = {
				...vector.metadata,
				[`user-${body.user}`]: 1,

				// For each space in body, add the spaceId to the vector metadata
				...(body.spaces ?? [])?.reduce((acc, space) => {
					acc[`space-${body.user}-${space}`] = 1;
					return acc;
				}, {}),
			};
			const content =
				vector.metadata.content.toString().split("Content: ")[1] ||
				vector.metadata.content;
			pageContent += `<---chunkId: ${vector.id}\n${content}\n---->`;
			return vector;
		});

		await context.env.VECTORIZE_INDEX.upsert(newVectors);
		return pageContent; //Return the page content that goes to d1 db
	}

	for (let i = 0; i < chunks.length; i++) {
		const chunk = chunks[i];
		const chunkId = `${uuid}-${i}`;

		const newPageContent = `Title: ${body.title}\nDescription: ${body.description}\nURL: ${body.url}\nContent: ${chunk}`;

		const docs = await store.addDocuments(
			[
				{
					pageContent: newPageContent,
					metadata: {
						title: body.title?.slice(0, 50) ?? "",
						description: body.description ?? "",
						url: body.url,
						type: body.type ?? "page",
						content: newPageContent,

						[sanitizeKey(`user-${body.user}`)]: 1,
						...body.spaces?.reduce((acc, space) => {
							acc[`space-${body.user}-${space}`] = 1;
							return acc;
						}, {}),
					},
				},
			],
			{
				ids: [chunkId],
			},
		);

		console.log("Docs added: ", docs);

		await context.env.KV.put(chunkId, ourID);
		pageContent += `<---chunkId: ${chunkId}\n${chunk}\n---->`;
	}
	return pageContent; // Return the pageContent  that goes to the d1 db
}
