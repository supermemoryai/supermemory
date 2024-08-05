import { Context } from "hono";
import { Env, vectorObj, Chunks } from "./types";
import { CloudflareVectorizeStore } from "@langchain/cloudflare";
import { OpenAIEmbeddings } from "./utils/OpenAIEmbedder";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { seededRandom } from "./utils/seededRandom";
import { bulkInsertKv } from "./utils/kvBulkInsert";

export async function initQuery(env: Env, model: string = "gpt-4o") {
	const embeddings = new OpenAIEmbeddings({
		apiKey: env.OPENAI_API_KEY,
		modelName: "text-embedding-3-small",
	});

	const store = new CloudflareVectorizeStore(embeddings, {
		index: env.VECTORIZE_INDEX,
	});

	let selectedModel:
		| ReturnType<ReturnType<typeof createOpenAI>>
		| ReturnType<ReturnType<typeof createGoogleGenerativeAI>>
		| ReturnType<ReturnType<typeof createAnthropic>>;

	switch (model) {
		case "claude-3-opus":
			const anthropic = createAnthropic({
				apiKey: env.ANTHROPIC_API_KEY,
				baseURL:
					"https://gateway.ai.cloudflare.com/v1/47c2b4d598af9d423c06fc9f936226d5/supermemory/anthropic",
			});
			selectedModel = anthropic.chat("claude-3-opus-20240229");
			console.log("Selected model: ", selectedModel);
			break;
		case "gemini-1.5-pro":
			const googleai = createGoogleGenerativeAI({
				apiKey: env.GOOGLE_AI_API_KEY,
				baseURL:
					"https://gateway.ai.cloudflare.com/v1/47c2b4d598af9d423c06fc9f936226d5/supermemory/google-vertex-ai",
			});
			selectedModel = googleai.chat("models/gemini-1.5-pro-latest");
			console.log("Selected model: ", selectedModel);
			break;
		case "gpt-4o":
		default:
			const openai = createOpenAI({
				apiKey: env.OPENAI_API_KEY,
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
	env: env,
}: {
	store: CloudflareVectorizeStore;
	body: z.infer<typeof vectorObj>;
	chunks: Chunks;
	env: Env;
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

	const allIds = await env.KV.list({ prefix: uuid });

	// If some chunks for that content already exist, we'll just update the metadata to include
	// the user.
	if (allIds.keys.length > 0) {
		const savedVectorIds = allIds.keys.map((key) => key.name);
		const vectors = [];
		//Search in a batch of 20
		for (let i = 0; i < savedVectorIds.length; i += 20) {
			const batch = savedVectorIds.slice(i, i + 20);
			const batchVectors = await env.VECTORIZE_INDEX.getByIds(batch);
			vectors.push(...batchVectors);
		}
		console.log(
			vectors.map((vector) => {
				return vector.id;
			}),
		);
		// Now, we'll update all vector metadatas with one more userId and all spaceIds
		const newVectors = vectors.map((vector) => {
			console.log(JSON.stringify(vector.metadata));
			vector.metadata = {
				...vector.metadata,
				[`user-${body.user}`]: 1,

				// For each space in body, add the spaceId to the vector metadata
				...(body.spaces ?? [])?.reduce((acc, space) => {
					acc[`space-${body.user}-${space}`] = 1;
					return acc;
				}, {}),
			};
			return vector;
		});

		// upsert in batch of 20
		const results = [];
		for (let i = 0; i < newVectors.length; i += 20) {
			results.push(newVectors.slice(i, i + 20));
			console.log(JSON.stringify(newVectors[1].id));
		}

		await Promise.all(
			results.map((result) => {
				return env.VECTORIZE_INDEX.upsert(result);
			}),
		);
		return;
	}

	switch (chunks.type) {
		case "tweet":
			{
				const commonMetaData = {
					type: body.type ?? "tweet",
					title: body.title?.slice(0, 50) ?? "",
					description: body.description?.slice(0, 50) ?? "",
					url: body.url,
					[sanitizeKey(`user-${body.user}`)]: 1,
				};

				const spaceMetadata = body.spaces?.reduce((acc, space) => {
					acc[`space-${body.user}-${space}`] = 1;
					return acc;
				}, {});

				const ids = [];
				const preparedDocuments = chunks.chunks
					.map((tweet, i) => {
						return tweet.chunkedTweet.map((chunk) => {
							const id = `${uuid}-${i}`;
							ids.push(id);
							const { tweetLinks, tweetVids, tweetId, tweetImages } =
								tweet.metadata;
							return {
								pageContent: chunk,
								metadata: {
									content: chunk,
									links: tweetLinks,
									videos: tweetVids,
									tweetId: tweetId,
									tweetImages: tweetImages,
									...commonMetaData,
									...spaceMetadata,
								},
							};
						});
					})
					.flat();

				const docs = await store.addDocuments(preparedDocuments, {
					ids: ids,
				});
				console.log("these are the doucment ids", ids);
				console.log("Docs added:", docs);
				const { CF_KV_AUTH_TOKEN, CF_ACCOUNT_ID, KV_NAMESPACE_ID } = env;
				await bulkInsertKv(
					{ CF_KV_AUTH_TOKEN, CF_ACCOUNT_ID, KV_NAMESPACE_ID },
					{ chunkIds: ids, urlid: ourID },
				);
			}
			break;
		case "page":
			{
				const commonMetaData = {
					type: body.type ?? "page",
					title: body.title?.slice(0, 50) ?? "",
					description: body.description?.slice(0, 50) ?? "",
					url: body.url,
					[sanitizeKey(`user-${body.user}`)]: 1,
				};
				const spaceMetadata = body.spaces?.reduce((acc, space) => {
					acc[`space-${body.user}-${space}`] = 1;
					return acc;
				}, {});

				const ids = [];
				const preparedDocuments = chunks.chunks.map((chunk, i) => {
					const id = `${uuid}-${i}`;
					ids.push(id);
					return {
						pageContent: chunk,
						metadata: {
							content: chunk,
							...commonMetaData,
							...spaceMetadata,
						},
					};
				});

				const docs = await store.addDocuments(preparedDocuments, { ids: ids });
				console.log("Docs added:", docs);
				const { CF_KV_AUTH_TOKEN, CF_ACCOUNT_ID, KV_NAMESPACE_ID } = env;
				await bulkInsertKv(
					{ CF_KV_AUTH_TOKEN, CF_ACCOUNT_ID, KV_NAMESPACE_ID },
					{ chunkIds: ids, urlid: ourID },
				);
			}
			break;
		case "note":
			{
				const commonMetaData = {
					title: body.title?.slice(0, 50) ?? "",
					type: body.type ?? "page",
					description: body.description?.slice(0, 50) ?? "",
					url: body.url,
					[sanitizeKey(`user-${body.user}`)]: 1,
				};
				const spaceMetadata = body.spaces?.reduce((acc, space) => {
					acc[`space-${body.user}-${space}`] = 1;
					return acc;
				}, {});

				const ids = [];
				const preparedDocuments = chunks.chunks.map((chunk, i) => {
					const id = `${uuid}-${i}`;
					ids.push(id);
					return {
						pageContent: chunk,
						metadata: {
							content: chunk,
							...commonMetaData,
							...spaceMetadata,
						},
					};
				});

				const docs = await store.addDocuments(preparedDocuments, { ids: ids });
				console.log("Docs added:", docs);
				const { CF_KV_AUTH_TOKEN, CF_ACCOUNT_ID, KV_NAMESPACE_ID } = env;
				await bulkInsertKv(
					{ CF_KV_AUTH_TOKEN, CF_ACCOUNT_ID, KV_NAMESPACE_ID },
					{ chunkIds: ids, urlid: ourID },
				);
			}
			break;
		case "image": {
			const commonMetaData = {
				type: body.type ?? "image",
				title: body.title,
				description: body.description?.slice(0, 50) ?? "",
				url: body.url,
				[sanitizeKey(`user-${body.user}`)]: 1,
			};
			const spaceMetadata = body.spaces?.reduce((acc, space) => {
				acc[`space-${body.user}-${space}`] = 1;
				return acc;
			}, {});

			const ids = [];
			const preparedDocuments = chunks.chunks.map((chunk, i) => {
				const id = `${uuid}-${i}`;
				ids.push(id);
				return {
					pageContent: chunk,
					metadata: {
						...commonMetaData,
						...spaceMetadata,
					},
				};
			});

			const docs = await store.addDocuments(preparedDocuments, { ids: ids });
			console.log("Docs added:", docs);
			const { CF_KV_AUTH_TOKEN, CF_ACCOUNT_ID, KV_NAMESPACE_ID } = env;
			await bulkInsertKv(
				{ CF_KV_AUTH_TOKEN, CF_ACCOUNT_ID, KV_NAMESPACE_ID },
				{ chunkIds: ids, urlid: ourID },
			);
		}
	}
	return;
}
