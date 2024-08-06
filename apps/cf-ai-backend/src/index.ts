import { boolean, z } from "zod";
import { Hono } from "hono";
import { CoreMessage, generateText, streamText, tool } from "ai";
import {
	chatObj,
	Chunks,
	Env,
	ImageChunks,
	PageOrNoteChunks,
	TweetChunks,
	vectorObj,
	vectorBody,
} from "./types";
import {
	batchCreateChunksAndEmbeddings,
	deleteDocument,
	initQuery,
} from "./helper";
import { timing } from "hono/timing";
import { logger } from "hono/logger";
import { poweredBy } from "hono/powered-by";
import { bearerAuth } from "hono/bearer-auth";
import { zValidator } from "@hono/zod-validator";
import chunkText from "./queueConsumer/chunkers/chonker";
import { systemPrompt, template } from "./prompts/prompt1";
import { swaggerUI } from "@hono/swagger-ui";
import { database } from "./db";
import { storedContent } from "@repo/db/schema";
import { sql, and, eq } from "drizzle-orm";
import { LIMITS } from "@repo/shared-types";
import { typeDecider } from "./queueConsumer/utils/typeDecider";
// import { chunkThread } from "./utils/chunkTweet";
import {
	chunkNote,
	chunkPage,
} from "./queueConsumer/chunkers/chunkPageOrNotes";
import { queue } from "./queueConsumer";
import { isErr } from "./errors/results";

const app = new Hono<{ Bindings: Env }>();

// ------- MIDDLEWARES -------
app.use("*", poweredBy());
app.use("*", timing());
app.use("*", logger());

app.use("/api/", async (c, next) => {
	if (c.env.NODE_ENV !== "development") {
		const auth = bearerAuth({ token: c.env.SECURITY_KEY });
		return auth(c, next);
	}
	return next();
});
// ------- MIDDLEWARES END -------

const fileSchema = z
	.instanceof(File)
	.refine(
		(file) => file.size <= 10 * 1024 * 1024,
		"File size should be less than 10MB",
	) // Validate file size
	.refine(
		(file) => ["image/jpeg", "image/png", "image/gif"].includes(file.type),
		"Invalid file type",
	); // Validate file type

app.get("/", (c) => {
	return c.text("Supermemory backend API is running!");
});

app.get("/api/health", (c) => {
	return c.json({ status: "ok" });
});

app.post("/api/add", zValidator("json", vectorBody), async (c) => {
	try {
		const body = c.req.valid("json");
		//This is something I don't like
		// console.log("api/add hit!!!!");
		//Have to do limit on this also duplicate check here
		const db = database(c.env);
		const typeResult = typeDecider(body.url);

		const saveToDbUrl =
			(body.url.split("#supermemory-user-")[0] ?? body.url) + // Why does this have to be a split from #supermemory-user?
			"#supermemory-user-" +
			body.user;

		console.log(
			"---------------------------------------------------------------------------------------------------------------------------------------------",
			saveToDbUrl,
		);
		const alreadyExist = await db
			.select()
			.from(storedContent)
			.where(eq(storedContent.baseUrl, saveToDbUrl));
		console.log(
			"------------------------------------------------",
			JSON.stringify(alreadyExist),
		);

		if (alreadyExist.length > 0) {
			console.log(
				"------------------------------------------------------------------------------------------------I exist------------------------",
			);
			return c.json({ status: "error", message: "the content already exists" });
		}

		if (isErr(typeResult)) {
			throw typeResult.error;
		}
		// limiting in the backend
		const type = typeResult.value;
		const countResult = await db
			.select({
				count: sql<number>`count(*)`.mapWith(Number),
			})
			.from(storedContent)
			.where(
				and(eq(storedContent.userId, body.user), eq(storedContent.type, type)),
			);

		const currentCount = countResult[0]?.count || 0;
		const totalLimit = LIMITS[type as keyof typeof LIMITS];
		const remainingLimit = totalLimit - currentCount;
		const items = 1;
		const isWithinLimit = items <= remainingLimit;

		// unique contraint check

		if (isWithinLimit) {
			const spaceNumbers = body.spaces.map((s: string) => Number(s));
			await c.env.EMBEDCHUNKS_QUEUE.send({
				content: body.url,
				user: body.user,
				space: spaceNumbers,
				type: type,
			});
		} else {
			return c.json({
				status: "error",
				message:
					"You have exceed the current limit for this type of document, please try removing something form memories ",
			});
		}

		return c.json({ status: "ok" });
	} catch (error) {
		console.error("Error processing request:", error);
		return c.json({ status: "error", message: error.message }, 500);
	}
});

app.post(
	"/api/add-with-image",
	zValidator(
		"form",
		z.object({
			images: z
				.array(fileSchema)
				.min(1, "At least one image is required")
				.optional(),
			"images[]": z
				.array(fileSchema)
				.min(1, "At least one image is required")
				.optional(),
			text: z.string().optional(),
			spaces: z.array(z.string()).optional(),
			url: z.string(),
			user: z.string(),
		}),
		(c) => {
			console.log(c);
		},
	),
	async (c) => {
		const body = c.req.valid("form");

		const { store } = await initQuery(c.env);

		if (!(body.images || body["images[]"])) {
			return c.json({ status: "error", message: "No images found" }, 400);
		}

		const imagePromises = (body.images ?? body["images[]"]).map(
			async (image) => {
				const buffer = await image.arrayBuffer();
				const input = {
					image: [...new Uint8Array(buffer)],
					prompt:
						"What's in this image? caption everything you see in great detail. If it has text, do an OCR and extract all of it.",
					max_tokens: 1024,
				};
				const response = await c.env.AI.run(
					"@cf/llava-hf/llava-1.5-7b-hf",
					input,
				);
				console.log(response.description);
				return response.description;
			},
		);

		const imageDescriptions = await Promise.all(imagePromises);
		const chunks: ImageChunks = {
			type: "image",
			chunks: [
				imageDescriptions,
				...(body.text ? chunkText(body.text, 1536) : []),
			].flat(),
		};

		await batchCreateChunksAndEmbeddings({
			store,
			body: {
				url: body.url,
				user: body.user,
				type: "image",
				description:
					imageDescriptions.length > 1
						? `A group of ${imageDescriptions.length} images on ${body.url}`
						: imageDescriptions[0],
				spaces: body.spaces,
				pageContent: imageDescriptions.join("\n"),
				title: "Image content from the web",
			},
			chunks: chunks,
			env: c.env,
		});

		return c.json({ status: "ok" });
	},
);

app.get(
	"/api/ask",
	zValidator(
		"query",
		z.object({
			query: z.string(),
		}),
	),
	async (c) => {
		const query = c.req.valid("query");

		const { model } = await initQuery(c.env);

		const response = await streamText({ model, prompt: query.query });
		const r = response.toTextStreamResponse();

		return r;
	},
);

app.get(
	"/api/search",
	zValidator("query", z.object({ query: z.string(), user: z.string() })),
	async (c) => {
		const { query, user } = c.req.valid("query");
		const filter: VectorizeVectorMetadataFilter = {
			[`user-${user}`]: 1,
		};

		const { store } = await initQuery(c.env);
		const queryAsVector = await store.embeddings.embedQuery(query);

		const resp = await c.env.VECTORIZE_INDEX.query(queryAsVector, {
			topK: 5,
			filter,
			returnMetadata: true,
		});

		const minScore = Math.min(...resp.matches.map(({ score }) => score));
		const maxScore = Math.max(...resp.matches.map(({ score }) => score));

		// This entire chat part is basically just a dumb down version of the /api/chat endpoint.
		const normalizedData = resp.matches.map((data) => ({
			...data,
			normalizedScore:
				maxScore !== minScore
					? 1 + ((data.score - minScore) / (maxScore - minScore)) * 98
					: 50,
		}));

		const preparedContext = normalizedData.map(
			({ metadata, score, normalizedScore }) => ({
				context: `Title: ${metadata!.title}\nDescription: ${metadata!.description}\nURL: ${metadata!.url}\nContent: ${metadata!.text}`,
				score,
				normalizedScore,
			}),
		);

		return c.json({
			status: "ok",
			response: preparedContext,
		});
	},
);

// This is a special endpoint for our "chatbot-only" solutions.
// It does both - adding content AND chatting with it.
app.post(
	"/api/autoChatOrAdd",
	zValidator(
		"query",
		z.object({
			query: z.string(),
			user: z.string(),
		}),
	),
	zValidator("json", chatObj),
	async (c) => {
		const { query, user } = c.req.valid("query");
		const { chatHistory } = c.req.valid("json");

		const { store, model } = await initQuery(c.env);

		let task: "add" | "chat" = "chat";
		let thingToAdd: "page" | "image" | "text" | undefined = undefined;
		let addContent: string | undefined = undefined;

		// This is a "router". this finds out if the user wants to add a document, or chat with the AI to get a response.
		const routerQuery = await generateText({
			model: model,
			system: `You are Supermemory chatbot. You can either add a document to the supermemory database, or return a chat response. Based on this query,
        You must determine what to do. Basically if it feels like a "question", then you should intiate a chat. If it feels like a "command" or feels like something that could be forwarded to the AI, then you should add a document.
        You must also extract the "thing" to add and what type of thing it is.`,
			prompt: `Question from user: ${query}`,
			tools: {
				decideTask: tool({
					description:
						"Decide if the user wants to add a document or chat with the AI",
					parameters: z.object({
						generatedTask: z.enum(["add", "chat"]),
						contentToAdd: z.object({
							thing: z.enum(["page", "image", "text"]),
							content: z.string(),
						}),
					}),
					execute: async ({ generatedTask, contentToAdd }) => {
						task = generatedTask;
						thingToAdd = contentToAdd.thing;
						addContent = contentToAdd.content;
					},
				}),
			},
		});

		if ((task as string) === "add") {
			// addString is the plaintext string that the user wants to add to the database
			//chunk the note
			let addString: string = addContent;
			let vectorContent: Chunks = chunkNote(addContent);

			if (thingToAdd === "page") {
				// TODO: Sometimes this query hangs, and errors out. we need to do proper error management here.
				const response = await fetch("https://md.dhr.wtf/?url=" + addContent, {
					headers: {
						Authorization: "Bearer " + c.env.SECURITY_KEY,
					},
				});

				addString = await response.text();
				vectorContent = chunkPage(addString);
			}

			// At this point, we can just go ahead and create the embeddings!
			await batchCreateChunksAndEmbeddings({
				store,
				body: {
					url: addContent,
					user,
					type: thingToAdd,
					pageContent: addString,
					title: `${addString.slice(0, 30)}... (Added from chatbot)`,
				},
				chunks: vectorContent,
				env: c.env,
			});

			return c.json({
				status: "ok",
				response:
					"I added the document to your personal second brain! You can now use it to answer questions or chat with me.",
				contentAdded: {
					type: thingToAdd,
					content: addString,
					url:
						thingToAdd === "page"
							? addContent
							: `https://supermemory.ai/note/${Date.now()}`,
				},
			});
		} else {
			const filter: VectorizeVectorMetadataFilter = {
				[`user-${user}`]: 1,
			};

			const queryAsVector = await store.embeddings.embedQuery(query);

			const resp = await c.env.VECTORIZE_INDEX.query(queryAsVector, {
				topK: 5,
				filter,
				returnMetadata: true,
			});

			const minScore = Math.min(...resp.matches.map(({ score }) => score));
			const maxScore = Math.max(...resp.matches.map(({ score }) => score));

			// This entire chat part is basically just a dumb down version of the /api/chat endpoint.
			const normalizedData = resp.matches.map((data) => ({
				...data,
				normalizedScore:
					maxScore !== minScore
						? 1 + ((data.score - minScore) / (maxScore - minScore)) * 98
						: 50,
			}));

			const preparedContext = normalizedData.map(
				({ metadata, score, normalizedScore }) => ({
					context: `Website title: ${metadata!.title}\nDescription: ${metadata!.description}\nURL: ${metadata!.url}\nContent: ${metadata!.text}`,
					score,
					normalizedScore,
				}),
			);

			const prompt = template({
				contexts: preparedContext,
				question: query,
			});

			const initialMessages: CoreMessage[] = [
				{
					role: "system",
					content: `You are an AI chatbot called "Supermemory.ai". When asked a question by a user, you must take all the context provided to you and give a good, small, but helpful response.`,
				},
				{ role: "assistant", content: "Hello, how can I help?" },
			];

			const userMessage: CoreMessage = { role: "user", content: prompt };

			const response = await generateText({
				model,
				messages: [
					...initialMessages,
					...((chatHistory || []) as CoreMessage[]),
					userMessage,
				],
			});

			return c.json({ status: "ok", response: response.text });
		}
	},
);

/* TODO: Eventually, we should not have to save each user's content in a seperate vector.
Lowkey, it makes sense. The user may save their own version of a page - like selected text from twitter.com url.
But, it's not scalable *enough*. How can we store the same vectors for the same content, without needing to duplicate for each uer?
Hard problem to solve, Vectorize doesn't have an OR filter, so we can't just filter by URL and user.
*/
app.post(
	"/api/chat",
	zValidator(
		"query",
		z.object({
			query: z.string(),
			user: z.string(),
			topK: z.number().optional().default(10),
			spaces: z.string().optional(),
			sourcesOnly: z.string().optional().default("false"),
			model: z.string().optional().default("gpt-4o"),
			proMode: z.string().optional().default("false"),
		}),
	),
	zValidator("json", chatObj),
	async (c) => {
		const query = c.req.valid("query");
		const body = c.req.valid("json");

		const sourcesOnly = query.sourcesOnly === "true";
		const proMode = query.proMode === "true";

		// Return early for dumb requests
		if (sourcesOnly && body.sources) {
			return c.json(body.sources);
		}

		const spaces = query.spaces?.split(",") ?? [undefined];

		// Get the AI model maker and vector store
		const { model, store } = await initQuery(c.env, query.model);

		if (!body.sources) {
			const filter: VectorizeVectorMetadataFilter = {
				[`user-${query.user}`]: 1,
			};

			let proModeListedQueries: string[] = [];

			if (proMode) {
				const addedToQuery = (await c.env.AI.run(
					// @ts-ignore
					"@hf/nousresearch/hermes-2-pro-mistral-7b",
					{
						messages: [
							{
								role: "system",
								content:
									"You are a query enhancer. You must enhance a user's query to make it more relevant to what the user might be looking for. If there's any mention of dates like 'last summer' or 'this year', you should return 'DAY: X, MONTH: Y, YEAR: Z'. If there's any mention of locations, add that to the query too. Try to keep your responses as short as possible. Add to the user's query, don't replace it. Make sure to keep your answers short.",
							},
							{ role: "user", content: query.query },
						],
						tools: [
							{
								type: "function",
								function: {
									name: "Enhance query get list",
									description:
										"Enhance the user's query to make it more relevant",
									parameters: {
										type: "object",
										properties: {
											listedQueries: {
												type: "array",
												description: "List of queries that the user has asked",
												items: {
													type: "string",
												},
											},
										},
										required: ["Enhance query get list"],
									},
								},
							},
						],
						max_tokens: 200,
					},
				)) as {
					response?: string;
					tool_calls?: {
						name: string;
						arguments: {
							listedQueries: string[];
						};
					}[];
				};

				proModeListedQueries =
					addedToQuery.tool_calls?.[0]?.arguments?.listedQueries ?? [];
			}

			// Converting the query to a vector so that we can search for similar vectors
			const queryAsVector = await store.embeddings.embedQuery(
				query.query + " " + proModeListedQueries.join(" "),
			);
			const responses: VectorizeMatches = { matches: [], count: 0 };

			// SLICED to 5 to avoid too many queries
			for (const space of spaces.slice(0, 5)) {
				if (space && space.length >= 1) {
					// it's possible for space list to be [undefined] so we only add space filter conditionally
					filter[`space-${query.user}-${space}`] = 1;
				}

				// Because there's no OR operator in the filter, we have to make multiple queries
				const resp = await c.env.VECTORIZE_INDEX.query(queryAsVector, {
					topK: query.topK,
					filter,
					returnMetadata: true,
				});

				// Basically recreating the response object
				if (resp.count > 0) {
					responses.matches.push(...resp.matches);
					responses.count += resp.count;
				}
			}

			const minScore = Math.min(...responses.matches.map(({ score }) => score));
			const maxScore = Math.max(...responses.matches.map(({ score }) => score));

			// We are "normalising" the scores - if all of them are on top, we want to make sure that
			// we have a way to filter out the noise.
			const normalizedData = responses.matches.map((data) => ({
				...data,
				normalizedScore:
					maxScore !== minScore
						? 1 + ((data.score - minScore) / (maxScore - minScore)) * 98
						: 50, // If all scores are the same, set them to the middle of the scale
			}));

			let highScoreData = normalizedData.filter(
				({ normalizedScore }) => normalizedScore > 50,
			);

			// If the normalsation is not done properly, we have a fallback to just get the
			// top 3 scores
			if (highScoreData.length === 0) {
				highScoreData = normalizedData
					.sort((a, b) => b.score - a.score)
					.slice(0, 3);
			}

			const sortedHighScoreData = highScoreData.sort(
				(a, b) => b.normalizedScore - a.normalizedScore,
			);

			body.sources = {
				normalizedData,
			};

			// So this is kinda hacky, but the frontend needs to do 2 calls to get sources and chat.
			// I think this is fine for now, but we can improve this later.
			if (sourcesOnly) {
				const idsAsStrings = sortedHighScoreData.map((dataPoint) =>
					dataPoint.id.toString(),
				);

				const storedContent = await Promise.all(
					idsAsStrings.map(async (id) => await c.env.KV.get(id)),
				);

				const metadata = normalizedData.map((datapoint) => datapoint.metadata);

				return c.json({
					ids: storedContent.filter(Boolean),
					metadata,
					normalizedData,
					proModeListedQueries,
				});
			}
		}

		//Serach mem0

		const preparedContext = body.sources.normalizedData.map(
			({ metadata, score, normalizedScore }) => ({
				context: `Website title: ${metadata!.title}\nDescription: ${metadata!.description}\nURL: ${metadata!.url}\nContent: ${metadata!.text}`,
				score,
				normalizedScore,
			}),
		);

		const initialMessages: CoreMessage[] = [
			{ role: "user", content: systemPrompt },
			{ role: "assistant", content: "Hello, how can I help?" }, // prase and add memory json here
		];

		const prompt = template({
			contexts: preparedContext,
			question: query.query,
		});

		const userMessage: CoreMessage = { role: "user", content: prompt };

		const response = await streamText({
			model: model,
			messages: [
				...initialMessages,
				...((body.chatHistory || []) as CoreMessage[]),
				userMessage,
			],
			// temperature: 0.4,
		});

		return response.toTextStreamResponse();
	},
);

app.delete(
	"/api/delete",
	zValidator(
		"query",
		z.object({
			websiteUrl: z.string(),
			user: z.string(),
		}),
	),
	async (c) => {
		const { websiteUrl, user } = c.req.valid("query");

		const { store } = await initQuery(c.env);

		await deleteDocument({ url: websiteUrl, user, c, store });

		return c.json({ message: "Document deleted" });
	},
);

// ERROR #1 - this is the api that the editor uses, it is just a scrape off of /api/chat so you may check that out
app.get(
	"/api/editorai",
	zValidator(
		"query",
		z.object({
			context: z.string(),
			request: z.string(),
		}),
	),
	async (c) => {
		const { context, request } = c.req.valid("query");
		const { model } = await initQuery(c.env);

		const response = await streamText({
			model,
			prompt: `${request}-${context}`,
			maxTokens: 224,
		});

		return response.toTextStreamResponse();
	},
);

app.get("/howFuckedAreWe", async (c) => {
	let keys = 0;
	const concurrencyLimit = 5; // Adjust this based on your system's capability
	const queue: string[] = [undefined]; // Start with an undefined cursor

	async function fetchKeys(cursor?: string): Promise<void> {
		const response = await c.env.KV.list({ cursor });
		keys += response.keys.length;

		// @ts-ignore
		if (response.cursor) {
			// @ts-ignore
			queue.push(response.cursor);
		}
	}

	async function getAllKeys(): Promise<void> {
		const promises: Promise<void>[] = [];

		while (queue.length > 0) {
			while (promises.length < concurrencyLimit && queue.length > 0) {
				const cursor = queue.shift();
				promises.push(fetchKeys(cursor));
			}

			await Promise.all(promises);
			promises.length = 0; // Clear the promises array
		}
	}

	await getAllKeys();

	console.log(`Total number of keys: ${keys}`);

	// on a scale of 200,000
	// what % are we there?
	const fuckedPercent = (keys / 200000) * 100;

	return c.json({ fuckedPercent });
});

export default {
	fetch: app.fetch,
	queue,
};
