import { Hono } from "hono";
import { Variables, Env, recommendedQuestionsSchema } from "../types";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  AISDKError,
  convertToCoreMessages,
  embed,
  generateObject,
  InvalidPromptError,
  Message,
  smoothStream,
  StreamData,
  streamText,
  TextPart,
} from "ai";
import {
  chatThreads,
  documents,
  chunk,
  spaces as spaceInDb,
  spaceAccess,
  type Space,
  contentToSpace,
} from "@supermemory/db/schema";
import { google, openai } from "../providers";
import { randomId } from "@supermemory/shared";
import {
  and,
  cosineDistance,
  database,
  desc,
  eq,
  exists,
  inArray,
  or,
  sql,
} from "@supermemory/db";
import { typeDecider } from "../utils/typeDecider";
import { isErr, Ok } from "../errors/results";

const actions = new Hono<{ Variables: Variables; Bindings: Env }>()
  .post(
    "/chat",
    zValidator(
      "json",
      z.object({
        messages: z.array(z.any()).min(1, "At least one message is required"),
        threadId: z.string().optional(),
      })
    ),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { messages, threadId } = await c.req.valid("json");

      const unfilteredCoreMessages = convertToCoreMessages(
        (messages as Message[])
          .filter((m) => m.content.length > 0)
          .map((m) => ({
            ...m,
            content:
              m.content +
              (m.annotations
                ? `<context>${JSON.stringify(m.annotations)}</context>`
                : ""),
            experimental_attachments:
              m.experimental_attachments?.length &&
              m.experimental_attachments?.length > 0
                ? m.experimental_attachments
                : (m.data as { files: [] })?.files,
          }))
      );

      const coreMessages = unfilteredCoreMessages.filter(
        (message) => message.content.length > 0
      );

      const db = database(c.env.HYPERDRIVE.connectionString);
      const { initLogger, wrapAISDKModel } = await import("braintrust");

      // Initialize clients and loggers
      const logger = initLogger({
        projectName: "supermemory",
        apiKey: c.env.BRAINTRUST_API_KEY,
      });

      const googleClient = wrapAISDKModel(
        openai(c.env).chat("gpt-4o-mini-2024-07-18")
      );

      // Get last user message and generate embedding in parallel with thread creation
      let lastUserMessage = coreMessages.findLast((i) => i.role === "user");
      const queryText =
        typeof lastUserMessage?.content === "string"
          ? lastUserMessage.content
          : lastUserMessage?.content.map((c) => (c as TextPart).text).join("");

      if (!queryText || queryText.length === 0) {
        return c.json({ error: "Empty query" }, 400);
      }

      // Run embedding generation and thread creation in parallel
      const [{ data: embedding }, thread] = await Promise.all([
        c.env.AI.run("@cf/baai/bge-base-en-v1.5", { text: queryText }),
        !threadId
          ? db
              .insert(chatThreads)
              .values({
                firstMessage: messages[0].content,
                userId: user.id,
                uuid: randomId(),
                messages: coreMessages,
              })
              .returning()
          : null,
      ]);

      const threadUuid = threadId || thread?.[0].uuid;

      if (!embedding) {
        return c.json({ error: "Failed to generate embedding" }, 500);
      }

      try {
        const data = new StreamData();

        // Pre-compute the vector similarity expression
        const vectorSimilarity = sql<number>`1 - (embeddings <=> ${JSON.stringify(embedding[0])}::vector)`;

        // Get matching chunks with document info
        const matchingChunks = await db
          .select({
            chunkId: chunk.id,
            documentId: chunk.documentId,
            textContent: chunk.textContent,
            orderInDocument: chunk.orderInDocument,
            metadata: chunk.metadata,
            similarity: vectorSimilarity,
            // Document fields
            docId: documents.id,
            docUuid: documents.uuid,
            docContent: documents.content,
            docType: documents.type,
            docUrl: documents.url,
            docTitle: documents.title,
            docDescription: documents.description,
            docOgImage: documents.ogImage,
          })
          .from(chunk)
          .innerJoin(documents, eq(chunk.documentId, documents.id))
          .where(
            and(eq(documents.userId, user.id), sql`${vectorSimilarity} > 0.3`)
          )
          .orderBy(desc(vectorSimilarity))
          .limit(25);

        // Get unique document IDs from matching chunks
        const uniqueDocIds = [
          ...new Set(matchingChunks.map((c) => c.documentId)),
        ];

        // Fetch all chunks for these documents to get context
        const contextChunks = await db
          .select({
            id: chunk.id,
            documentId: chunk.documentId,
            textContent: chunk.textContent,
            orderInDocument: chunk.orderInDocument,
            metadata: chunk.metadata,
          })
          .from(chunk)
          .where(inArray(chunk.documentId, uniqueDocIds))
          .orderBy(chunk.documentId, chunk.orderInDocument);

        // Group chunks by document
        const chunksByDocument = new Map<number, typeof contextChunks>();
        for (const chunk of contextChunks) {
          const docChunks = chunksByDocument.get(chunk.documentId) || [];
          docChunks.push(chunk);
          chunksByDocument.set(chunk.documentId, docChunks);
        }

        // Create context with surrounding chunks
        const contextualResults = matchingChunks.map((match) => {
          const docChunks = chunksByDocument.get(match.documentId) || [];
          const matchIndex = docChunks.findIndex((c) => c.id === match.chunkId);

          // Get surrounding chunks (2 before and 2 after for more context)
          const start = Math.max(0, matchIndex - 2);
          const end = Math.min(docChunks.length, matchIndex + 3);
          const relevantChunks = docChunks.slice(start, end);

          return {
            id: match.docId,
            title: match.docTitle,
            description: match.docDescription,
            url: match.docUrl,
            type: match.docType,
            content: relevantChunks.map((c) => c.textContent).join("\n"),
            similarity: Number(match.similarity.toFixed(4)),
            chunks: relevantChunks.map((c) => ({
              id: c.id,
              content: c.textContent,
              orderInDocument: c.orderInDocument,
              metadata: c.metadata,
              isMatch: c.id === match.chunkId,
            })),
          };
        });

        // Sort by similarity and take top results
        const topResults = contextualResults
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 10);

        data.appendMessageAnnotation(topResults);

        if (lastUserMessage) {
          lastUserMessage.content =
            typeof lastUserMessage.content === "string"
              ? lastUserMessage.content +
                `<context>${JSON.stringify(topResults)}</context>`
              : [
                  ...lastUserMessage.content,
                  {
                    type: "text",
                    text: `<context>${JSON.stringify(topResults)}</context>`,
                  },
                ];
          coreMessages[coreMessages.length - 1] = lastUserMessage;
        }

        const result = await streamText({
          model: googleClient,
          experimental_providerMetadata: {
            metadata: { userId: user.id, chatThreadId: threadUuid ?? "" },
          },
          experimental_transform: smoothStream(),
          messages: [
            {
              role: "system",
              content: `You are a knowledgeable and helpful AI assistant for Supermemory, a personal knowledge management app. Your goal is to help users explore and understand their saved content.
  
  Key guidelines:
  - Maintain natural, engaging conversation while seamlessly incorporating relevant information from the user's knowledge base
  - Build on previous messages in the conversation to provide coherent, contextual responses
  - Be concise but thorough, focusing on the most relevant details
  - When appropriate, make connections between different pieces of information
  - If you're not sure about something, be honest and say so
  - Feel free to ask clarifying questions if needed
  - Make it easy to read for the user!
  - Use markdown to format your responses but dont make your answers TOO long include any and all information related to context in the response if possible.
  - only talk about the context if the right answer is in the context.
  - You are Supermemory - a personal knowledge management app.
  - You are built by Dhravya Shah (https://dhravya.dev). And the supermemory team (https://supermemory.ai).
  
  The user's saved content is provided in <context> tags. Use this information naturally without explicitly referencing it.`,
            },
            ...coreMessages,
          ],
          async onFinish(completion) {
            try {
              if (lastUserMessage) {
                lastUserMessage.content =
                  typeof lastUserMessage.content === "string"
                    ? lastUserMessage.content.replace(
                        /<context>[\s\S]*?<\/context>/g,
                        ""
                      )
                    : lastUserMessage.content.filter(
                        (part) =>
                          !(
                            part.type === "text" &&
                            part.text.startsWith("<context>")
                          )
                      );
                coreMessages[coreMessages.length - 1] = lastUserMessage;
              }

              const newMessages = [
                ...coreMessages,
                {
                  role: "assistant",
                  content:
                    completion.text +
                    `<context>[${JSON.stringify(topResults)}]</context>`,
                },
              ];

              if (threadUuid) {
                await db
                  .update(chatThreads)
                  .set({ messages: newMessages })
                  .where(eq(chatThreads.uuid, threadUuid));
              }
            } catch (error) {
              console.error("Failed to update thread:", error);
            } finally {
              await data.close();
            }
          },
        });

        return result.toDataStreamResponse({
          headers: {
            "Supermemory-Thread-Uuid": threadUuid ?? "",
            "Content-Type": "text/x-unknown",
            "content-encoding": "identity",
            "transfer-encoding": "chunked",
          },
          data,
        });
      } catch (error) {
        console.error("Chat error:", error);

        if (error instanceof InvalidPromptError) {
          return c.json(
            { error: "Invalid prompt - please rephrase your message" },
            400
          );
        }

        if ((error as AISDKError).cause === "ECONNREFUSED") {
          return c.json({ error: "Database connection failed" }, 503);
        }

        return c.json(
          {
            error: "An unexpected error occurred",
            details:
              c.env.NODE_ENV === "development"
                ? (error as Error).message
                : undefined,
          },
          500
        );
      }
    }
  )
  .get(
    "/chat/:threadUuid",
    zValidator(
      "param",
      z.object({
        threadUuid: z.string(),
      })
    ),
    async (c) => {
      const user = c.get("user");
      const threadUuid = c.req.valid("param").threadUuid;

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const chatHistory = await database(c.env.HYPERDRIVE.connectionString)
        .select()
        .from(chatThreads)
        .where(
          and(eq(chatThreads.userId, user.id), eq(chatThreads.uuid, threadUuid))
        );

      if (!chatHistory) {
        return c.json({ error: "Chat history not found" }, 404);
      }

      return c.json({ chatHistory: chatHistory[0].messages });
    }
  )
  .get("/recommended-questions", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = database(c.env.HYPERDRIVE.connectionString);
    const recentDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, user.id))
      .orderBy(sql`RANDOM()`)
      .limit(3);

    if (recentDocuments.length === 0) {
      return c.json({ questions: [] });
    }

    const cachedQuestions = await c.env.MD_CACHE.get(`rq:${user.id}`);
    if (cachedQuestions) {
      const randomQuestions = JSON.parse(cachedQuestions)
        .questions.sort(() => Math.random() - 0.5)
        .slice(0, 3);
      return c.json({ questions: randomQuestions });
    }

    const { initLogger, wrapAISDKModel } = await import("braintrust");

    const logger = initLogger({
      projectName: "supermemory",
      apiKey: c.env.BRAINTRUST_API_KEY,
    });

    const model = wrapAISDKModel(openai(c.env).chat("gpt-4o-mini-2024-07-18"));

    const aiResponse = await generateObject({
      schema: z.object({
        questions: recommendedQuestionsSchema,
      }),
      model,
      prompt: `You are helping generate search suggestions for a user's personal knowledge base. 
      
  Generate 10 specific, focused questions based on the following documents. The questions should:
  - Be highly specific and reference concrete details from the documents
  - Focus on key insights, important facts, or interesting relationships
  - Be phrased naturally, as if the user is trying to recall something they learned
  - Be 2-8 words long
  - Not include generic questions that could apply to any document
  
  Documents:
  ${recentDocuments.map((d) => d.content).join("\n\n")}`,
    });

    await c.env.MD_CACHE.put(
      `rq:${user.id}`,
      JSON.stringify(aiResponse.object),
      {
        // 3 hours
        expirationTtl: 10800,
      }
    );

    const questions = aiResponse.object.questions;
    const randomQuestions = questions
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return c.json({ questions: randomQuestions });
  })
  .get("/suggested-learnings", async (c) => {
    const user = await c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const db = database(c.env.HYPERDRIVE.connectionString);

    // Try to get from cache first
    const cacheKey = `sl:${user.id}`;
    const cached = await c.env.MD_CACHE.get(cacheKey);
    if (cached) {
      return c.json({
        suggestedLearnings: JSON.parse(cached) as { [x: string]: string },
      });
    }

    // Get random sample of user's documents that are well-distributed
    const recentLearnings = await db
      .select()
      .from(documents)
      .where(eq(documents.userId, user.id))
      // Use random() to get distributed sample
      .orderBy(sql`RANDOM()`)
      .limit(7);

    if (recentLearnings.length === 0 || recentLearnings.length < 3) {
      return c.json({ suggestedLearnings: [] });
    }

    // for each document, i want to generate a list of
    // small markdown tweet-like things that the user might want to remember about
    const suggestedLearnings = await Promise.all(
      recentLearnings.map(async (document) => {
        const model = openai(c.env).chat("gpt-4o-mini-2024-07-18");
        const prompt = `Generate a concise topic recall card for this document. The card should:
  - Have a clear title that captures the main topic
  - based on when the document was saved, include a brief "Last (week/month/...), you saved notes on..." intro (do something different every time.)
  - List 2-3 key points from the content in simple bullet points
  - Keep the total length under 280 characters
  - Focus on the core concepts worth remembering
  - Be in markdown format
  - if you don't have a good suggestions, just skip that document.
  
  Here's the document content: ${document.content}, Document saved at: ${document.updatedAt}, Today's date: ${new Date().toLocaleDateString()}`;
        const response = await generateObject({
          schema: z.object({
            [document.uuid]: z.string(),
          }),
          // @ts-ignore
          model,
          prompt,
        });
        return response.object;
      })
    );

    // Cache the results
    await c.env.MD_CACHE.put(cacheKey, JSON.stringify(suggestedLearnings), {
      expirationTtl: 60 * 60 * 3, // 3 hours
    });

    return c.json({ suggestedLearnings });
  })
  .post(
    "/search",
    zValidator(
      "json",
      z.object({
        query: z.string().min(1, "Search query cannot be empty"),
        limit: z.number().min(1).max(50).default(10),
        threshold: z.number().min(0).max(1).default(0),
        spaces: z.array(z.string()).optional(),
      })
    ),
    async (c) => {
      const { query, limit, threshold, spaces } = c.req.valid("json");
      const user = c.get("user");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const db = database(c.env.HYPERDRIVE.connectionString);

      if (spaces && spaces.length > 0) {
        const spaceDetails = await Promise.all(
          spaces.map(async (spaceId) => {
            const space = await db
              .select()
              .from(spaceInDb)
              .where(eq(spaceInDb.uuid, spaceId))
              .limit(1);

            if (space.length === 0) return null;
            return {
              id: space[0].id,
              ownerId: space[0].ownerId,
              uuid: space[0].uuid,
            };
          })
        );

        // Filter out any null values and check permissions
        const validSpaces = spaceDetails.filter(
          (s): s is NonNullable<typeof s> => s !== null
        );
        const unauthorized = validSpaces.filter((s) => s.ownerId !== user.id);

        if (unauthorized.length > 0) {
          return c.json(
            {
              error: "Space permission denied",
              details: unauthorized.map((s) => s.uuid).join(", "),
            },
            403
          );
        }

        // Replace UUIDs with IDs for the database query
        spaces.splice(
          0,
          spaces.length,
          ...validSpaces.map((s) => s.id.toString())
        );
      }

      try {
        // Generate embedding for the search query
        const embeddings = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
          text: query,
        });

        if (!embeddings.data) {
          return c.json(
            { error: "Failed to generate embedding for query" },
            500
          );
        }

        // Pre-compute the vector similarity expression
        const vectorSimilarity = sql<number>`1 - (embeddings <=> ${JSON.stringify(embeddings.data[0])}::vector)`;

        // Get matching chunks
        const results = await db
          .select({
            chunkId: chunk.id,
            documentId: chunk.documentId,
            textContent: chunk.textContent,
            orderInDocument: chunk.orderInDocument,
            metadata: chunk.metadata,
            similarity: vectorSimilarity,
            // Document fields
            docUuid: documents.uuid,
            docContent: documents.content,
            docType: documents.type,
            docUrl: documents.url,
            docTitle: documents.title,
            docCreatedAt: documents.createdAt,
            docUpdatedAt: documents.updatedAt,
            docUserId: documents.userId,
            docDescription: documents.description,
            docOgImage: documents.ogImage,
          })
          .from(chunk)
          .innerJoin(documents, eq(chunk.documentId, documents.id))
          .where(
            and(
              eq(documents.userId, user.id),
              sql`${vectorSimilarity} > ${threshold}`,
              ...(spaces && spaces.length > 0
                ? [
                    exists(
                      db
                        .select()
                        .from(contentToSpace)
                        .where(
                          and(
                            eq(contentToSpace.contentId, documents.id),
                            inArray(
                              contentToSpace.spaceId,
                              spaces.map((spaceId) => Number(spaceId))
                            )
                          )
                        )
                    ),
                  ]
                : [])
            )
          )
          .orderBy(desc(vectorSimilarity))
          .limit(limit);

        // Group results by document and take the best matching chunk
        const documentResults = new Map<number, (typeof results)[0]>();
        for (const result of results) {
          const existingResult = documentResults.get(result.documentId);
          if (
            !existingResult ||
            result.similarity > existingResult.similarity
          ) {
            documentResults.set(result.documentId, result);
          }
        }

        // Convert back to array and format response
        const finalResults = Array.from(documentResults.values())
          .sort((a, b) => b.similarity - a.similarity)
          .map((r) => ({
            id: r.documentId,
            uuid: r.docUuid,
            content: r.docContent,
            type: r.docType,
            url: r.docUrl,
            title: r.docTitle,
            createdAt: r.docCreatedAt,
            updatedAt: r.docUpdatedAt,
            userId: r.docUserId,
            description: r.docDescription,
            ogImage: r.docOgImage,
            similarity: Number(r.similarity.toFixed(4)),
            matchingChunk: {
              id: r.chunkId,
              content: r.textContent,
              orderInDocument: r.orderInDocument,
              metadata: r.metadata,
            },
          }));

        return c.json({ results: finalResults });
      } catch (error) {
        console.error("[Search Error]", error);
        return c.json(
          {
            error: "Search failed",
            details:
              c.env.NODE_ENV === "development"
                ? (error as Error).message
                : undefined,
          },
          500
        );
      }
    }
  )
  .post(
    "/add",
    zValidator(
      "json",
      z.object({
        content: z.string().min(1, "Content cannot be empty"),
        spaces: z.array(z.string()).max(5).optional(),
        prefetched: z
          .object({
            contentToVectorize: z.string(),
            contentToSave: z.string(),
            title: z.string(),
            type: z.string(),
            description: z.string().optional(),
            ogImage: z.string().optional(),
          })
          .optional(),
      })
    ),
    async (c) => {
      const body = c.req.valid("json");
      console.log("body", body);
      const user = c.get("user");

      if (!user) {
        return c.json({ error: "You must be logged in to add content" }, 401);
      }

      const type = body.prefetched
        ? Ok(body.prefetched.type)
        : typeDecider(body.content);

      if (isErr(type)) {
        return c.json(
          {
            error: "Could not determine content type",
            details: type.error.message,
          },
          400
        );
      }

      if (type.value === "page" && !body.content.startsWith("http")) {
        body.content = `https://${body.content}`;
      }

      const uuid = randomId();
      const contentId = `add-${user.id}-${uuid}`;

      const db = database(c.env.HYPERDRIVE.connectionString);

      // Calculate document hash early to enable faster duplicate detection
      const content = body.prefetched?.contentToVectorize || body.content;
      const encoder = new TextEncoder();
      const data = encoder.encode(content);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const documentHash = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Check for duplicates using hash
      const existingDocs = await db
        .select()
        .from(documents)
        .where(
          and(
            eq(documents.userId, user.id),
            or(
              eq(documents.contentHash, documentHash),
              and(
                eq(documents.type, type.value),
                or(eq(documents.url, body.content), eq(documents.raw, content))
              )
            )
          )
        );

      if (existingDocs.length > 0) {
        return c.json(
          { error: `That ${type.value} already exists in your memories` },
          409
        );
      }

      // Check space permissions if spaces are specified
      if (body.spaces && body.spaces.length > 0) {
        const spacePermissions = await Promise.all(
          body.spaces.map(async (spaceId) => {
            const space = await db
              .select()
              .from(spaceInDb)
              .where(eq(spaceInDb.uuid, spaceId))
              .limit(1);

            if (!space[0]) {
              // create a new space for the user with the given id
              const newSpace = await db
                .insert(spaceInDb)
                .values({
                  uuid: spaceId,
                  name: spaceId,
                  isPublic: false,
                  ownerId: user.id,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
                .returning();

              return {
                spaceId: newSpace[0].id,
                allowed: true,
                error: null,
              };
            }

            const spaceData = space[0] as Space;

            // If public space, only owner can add content
            if (spaceData.isPublic) {
              return {
                spaceId,
                allowed: spaceData.ownerId === user.id,
                error:
                  spaceData.ownerId !== user.id
                    ? "Only space owner can add to public spaces"
                    : null,
              };
            }

            // For private spaces, check if user is owner or in allowlist
            const spaceAccessCheck = await db
              .select()
              .from(spaceAccess)
              .where(
                and(
                  eq(spaceAccess.spaceId, spaceData.id),
                  eq(spaceAccess.userEmail, user.email),
                  eq(spaceAccess.status, "accepted")
                )
              )
              .limit(1);

            return {
              spaceId,
              allowed:
                spaceData.ownerId === user.id || spaceAccessCheck.length > 0,
              error:
                spaceData.ownerId !== user.id && !spaceAccessCheck.length
                  ? "Not authorized to add to this space"
                  : null,
            };
          })
        );

        const unauthorized = spacePermissions.filter((p) => !p.allowed);
        if (unauthorized.length > 0) {
          return c.json(
            {
              error: "Space permission denied",
              details: unauthorized
                .map((u) => `${u.spaceId}: ${u.error}`)
                .join(", "),
            },
            403
          );
        }
      }

      const isExternalContent = [
        "page",
        "tweet",
        "document",
        "notion",
      ].includes(type.value);
      const indexedUrl = isExternalContent
        ? body.content
        : `https://supermemory.ai/content/${contentId}`;

      // Insert into documents table with hash
      try {
        await db.insert(documents).values({
          uuid: contentId,
          userId: user.id,
          type: type.value,
          url: indexedUrl,
          title: body.prefetched?.title,
          description: body.prefetched?.description,
          ogImage: body.prefetched?.ogImage,
          contentHash: documentHash,
          raw:
            (body.prefetched ?? body.content) + "\n\n" + body.spaces?.join(" "),
        });

        await c.env.CONTENT_WORKFLOW.create({
          params: {
            userId: user.id,
            content: body.content,
            spaces: body.spaces,
            type: type.value,
            uuid: contentId,
            url: indexedUrl,
            prefetched: body.prefetched,
          },
          id: contentId,
        });

        return c.json({
          message: "Content added successfully",
          id: contentId,
          type: type.value,
        });
      } catch (error) {
        console.error("[Add Content Error]", error);
        return c.json({ error: "Failed to process content" }, 500);
      }
    }
  )
  .post(
    "/batch-add",
    zValidator(
      "json",
      z
        .object({
          urls: z
            .array(z.string())
            .min(1, "At least one URL is required")
            .optional(),
          contents: z
            .array(
              z.object({
                content: z.string(),
                title: z.string(),
                type: z.string(),
              })
            )
            .optional(),
          spaces: z.array(z.string()).max(5).optional(),
        })
        .refine((data) => data.urls || data.contents, {
          message: "Either urls or contents must be provided",
        })
    ),
    async (c) => {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const { urls, contents, spaces } = await c.req.valid("json");

      // Check space permissions if spaces are specified
      if (spaces && spaces.length > 0) {
        const db = database(c.env.HYPERDRIVE.connectionString);
        const spacePermissions = await Promise.all(
          spaces.map(async (spaceId) => {
            const space = await db
              .select()
              .from(spaceInDb)
              .where(eq(spaceInDb.uuid, spaceId))
              .limit(1);

            if (!space[0]) {
              return { spaceId, allowed: false, error: "Space not found" };
            }

            const spaceData = space[0] as Space;

            // If public space, only owner can add content
            if (spaceData.isPublic) {
              return {
                spaceId,
                allowed: spaceData.ownerId === user.id,
                error:
                  spaceData.ownerId !== user.id
                    ? "Only space owner can add to public spaces"
                    : null,
              };
            }

            // For private spaces, check if user is owner or in allowlist
            const spaceAccessCheck = await db
              .select()
              .from(spaceAccess)
              .where(
                and(
                  eq(spaceAccess.spaceId, spaceData.id),
                  eq(spaceAccess.userEmail, user.email),
                  eq(spaceAccess.status, "accepted")
                )
              )
              .limit(1);

            return {
              spaceId,
              allowed:
                spaceData.ownerId === user.id || spaceAccessCheck.length > 0,
              error:
                spaceData.ownerId !== user.id && !spaceAccessCheck.length
                  ? "Not authorized to add to this space"
                  : null,
            };
          })
        );

        const unauthorized = spacePermissions.filter((p) => !p.allowed);
        if (unauthorized.length > 0) {
          return c.json(
            {
              error: "Space permission denied",
              details: unauthorized
                .map((u) => `${u.spaceId}: ${u.error}`)
                .join(", "),
            },
            403
          );
        }
      }

      // Create a new ReadableStream for progress updates
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const db = database(c.env.HYPERDRIVE.connectionString);
          const items = urls || contents || [];
          const total = items.length;
          let processed = 0;
          let failed = 0;
          let succeeded = 0;

          const sendMessage = (data: any) => {
            const message = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
            controller.enqueue(message);
          };

          for (const item of items) {
            try {
              processed++;

              // Handle both URL and markdown content
              const content = typeof item === "string" ? item : item.content;
              const title = typeof item === "string" ? null : item.title;
              const type =
                typeof item === "string" ? typeDecider(item) : Ok(item.type);

              if (isErr(type)) {
                failed++;
                sendMessage({
                  progress: Math.round((processed / total) * 100),
                  status: "error",
                  url: typeof item === "string" ? item : item.title,
                  error: type.error.message,
                  processed,
                  total,
                  succeeded,
                  failed,
                });
                continue;
              }

              // Calculate document hash
              const encoder = new TextEncoder();
              const data = encoder.encode(content);
              const hashBuffer = await crypto.subtle.digest("SHA-256", data);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const documentHash = hashArray
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");

              // Check for duplicates
              const existingDocs = await db
                .select()
                .from(documents)
                .where(
                  and(
                    eq(documents.userId, user.id),
                    or(
                      eq(documents.contentHash, documentHash),
                      eq(documents.raw, content)
                    )
                  )
                );

              if (existingDocs.length > 0) {
                failed++;
                sendMessage({
                  progress: Math.round((processed / total) * 100),
                  status: "duplicate",
                  title: typeof item === "string" ? item : item.title,
                  processed,
                  total,
                  succeeded,
                  failed,
                });
                continue;
              }

              const contentId = `add-${user.id}-${randomId()}`;
              const isExternalContent =
                typeof item === "string" &&
                ["page", "tweet", "document", "notion"].includes(type.value);
              const url = isExternalContent
                ? content
                : `https://supermemory.ai/content/${contentId}`;

              // Insert into documents table
              await db.insert(documents).values({
                uuid: contentId,
                userId: user.id,
                type: type.value,
                url,
                title,
                contentHash: documentHash,
                raw: content + "\n\n" + spaces?.join(" "),
              });

              // Create workflow for processing
              await c.env.CONTENT_WORKFLOW.create({
                params: {
                  userId: user.id,
                  content,
                  spaces,
                  type: type.value,
                  uuid: contentId,
                  url,
                },
                id: contentId,
              });

              succeeded++;
              sendMessage({
                progress: Math.round((processed / total) * 100),
                status: "success",
                title: typeof item === "string" ? item : item.title,
                processed,
                total,
                succeeded,
                failed,
              });

              // Add a small delay between requests
              await new Promise((resolve) => setTimeout(resolve, 100));
            } catch (error) {
              failed++;
              sendMessage({
                progress: Math.round((processed / total) * 100),
                status: "error",
                title: typeof item === "string" ? item : item.title,
                error: error instanceof Error ? error.message : "Unknown error",
                processed,
                total,
                succeeded,
                failed,
              });
            }
          }

          sendMessage({
            progress: 100,
            status: "complete",
            processed,
            total,
            succeeded,
            failed,
          });
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }
  );

export default actions;
