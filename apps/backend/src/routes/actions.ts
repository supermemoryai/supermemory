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
} from "@supermemory/db/schema";
import { google, openai } from "../providers";
import { randomId } from "@supermemory/shared";
import {
  and,
  cosineDistance,
  database,
  desc,
  eq,
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

      // TODO: add rate limiting

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
              m.experimental_attachments &&
              m.experimental_attachments.length > 0
                ? m.experimental_attachments
                : (m.data as { files: [] })?.files,
          }))
      );

      // make sure that there is no empty messages. if there is, remove it.
      const coreMessages = unfilteredCoreMessages.filter(
        (message) => message.content.length > 0
      );
      // .map(async (c) => {
      //   if (
      //     Array.isArray(c.content) &&
      //     c.content.some((c) => c.type !== "text")
      //   ) {
      //     // convert attachments (IMAGE and files) to base64 by fetching them
      //     const attachments = c.content.filter((c) => c.type !== "text");
      //     const base64Attachments = await Promise.all(
      //       attachments.map(async (a) => {
      //         const type = (a as ImagePart | FilePart).type;
      //         if (type === "image") {
      //           const response = await fetch((a as ImagePart).image.toString());
      //           return response.arrayBuffer();
      //         } else if (type === "file") {
      //           const response = await fetch((a as FilePart).data.toString());
      //           return response.arrayBuffer();
      //         }
      //       })
      //     );
      //   }
      // });

      console.log("Core messages", JSON.stringify(coreMessages, null, 2));

      let threadUuid = threadId;

      const { initLogger, wrapAISDKModel } = await import("braintrust");

      const logger = initLogger({
        projectName: "supermemory",
        apiKey: c.env.BRAINTRUST_API_KEY,
      });

      // const gemini = createOpenAI({
      //   apiKey: c.env.GEMINI_API_KEY,
      //   baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      // });
      const openaiClient = openai(c.env);

      const googleClient = wrapAISDKModel(
        // google(c.env.GEMINI_API_KEY).chat("gemini-exp-1206")
        openai(c.env).chat("gpt-4o")
      );

      // Create new thread if none exists
      if (!threadUuid) {
        const uuid = randomId();
        const newThread = await database(c.env.HYPERDRIVE.connectionString)
          .insert(chatThreads)
          .values({
            firstMessage: messages[0].content,
            userId: user.id,
            uuid: uuid,
            messages: coreMessages,
          })
          .returning();

        threadUuid = newThread[0].uuid;
      }
      const openAi = openai(c.env);

      const model = openAi.embedding("text-embedding-3-large", {
        dimensions: 1536,
      });

      let lastUserMessage = coreMessages
        .reverse()
        .find((i) => i.role === "user");

      // get the text of lastUserMEssage
      const queryText =
        typeof lastUserMessage?.content === "string"
          ? lastUserMessage.content
          : lastUserMessage?.content.map((c) => (c as TextPart).text).join("");

      console.log("querytext", queryText);

      const embedStart = performance.now();
      const { embedding } = await embed({
        model,
        value: queryText,
      });
      const embedEnd = performance.now();
      console.log(`Embedding generation took ${embedEnd - embedStart}ms`);

      if (!embedding) {
        return c.json({ error: "Failed to generate embedding for query" }, 500);
      }

      // Perform semantic search using cosine similarity
      // Log the query text to debug what we're searching for
      console.log("Searching for:", queryText);
      console.log("user id", user.id);

      const similarity = sql<number>`1 - (${cosineDistance(
        chunk.embeddings,
        embedding
      )})`;

      // Find similar chunks using cosine similarity
      // Join with documents table to get chunks only from documents the user has access to
      // First get all results to normalize
      // Get top 20 results first to avoid processing entire dataset
      const dbQueryStart = performance.now();
      const topResults = await database(c.env.HYPERDRIVE.connectionString)
        .select({
          similarity,
          id: documents.id,
          content: documents.content,
          type: documents.type,
          url: documents.url,
          title: documents.title,
          createdAt: documents.createdAt,
          updatedAt: documents.updatedAt,
          userId: documents.userId,
          description: documents.description,
          ogImage: documents.ogImage,
        })
        .from(chunk)
        .innerJoin(documents, eq(chunk.documentId, documents.id))
        .where(and(eq(documents.userId, user.id), sql`${similarity} > 0.4`))
        .orderBy(desc(similarity));

      // Get unique documents with their highest similarity chunks
      const uniqueDocuments = Object.values(
        topResults.reduce(
          (acc, curr) => {
            if (
              !acc[curr.id] ||
              acc[curr.id].content === curr.content ||
              acc[curr.id].url === curr.url
            ) {
              acc[curr.id] = curr;
            }
            return acc;
          },
          {} as Record<number, (typeof topResults)[0]>
        )
      ).slice(0, 5);

      const dbQueryEnd = performance.now();
      console.log(`Database query took ${dbQueryEnd - dbQueryStart}ms`);

      // Calculate min/max once for the subset
      const processingStart = performance.now();
      const minSimilarity = Math.min(
        ...uniqueDocuments.map((r) => r.similarity)
      );
      const maxSimilarity = Math.max(
        ...uniqueDocuments.map((r) => r.similarity)
      );
      const range = maxSimilarity - minSimilarity;

      // Normalize the results
      const normalizedResults = uniqueDocuments.map((result) => ({
        ...result,
        normalizedSimilarity:
          range === 0 ? 1 : (result.similarity - minSimilarity) / range,
      }));

      // Get either all results above 0.6 threshold, or at least top 3 results
      const results = normalizedResults
        .sort((a, b) => b.normalizedSimilarity - a.normalizedSimilarity)
        .slice(
          0,
          Math.max(
            3,
            normalizedResults.filter((r) => r.normalizedSimilarity > 0.6).length
          )
        );

      const processingEnd = performance.now();
      console.log(
        `Results processing took ${processingEnd - processingStart}ms`
      );

      const cleanDocumentsForContext = results.map((d) => ({
        title: d.title,
        description: d.description,
        url: d.url,
        type: d.type,
        content: d.content,
      }));

      // Update lastUserMessage with search results
      const messageUpdateStart = performance.now();
      if (lastUserMessage) {
        lastUserMessage.content =
          typeof lastUserMessage.content === "string"
            ? lastUserMessage.content +
              `<context>${JSON.stringify(cleanDocumentsForContext)}</context>`
            : [
                ...lastUserMessage.content,
                {
                  type: "text",
                  text: `<context>${JSON.stringify(cleanDocumentsForContext)}</context>`,
                },
              ];
      }

      // edit the last coreusermessage in the array
      if (lastUserMessage) {
        coreMessages[coreMessages.length - 1] = lastUserMessage;
      }
      const messageUpdateEnd = performance.now();
      console.log(
        `Message update took ${messageUpdateEnd - messageUpdateStart}ms`
      );

      try {
        const streamStart = performance.now();
        const result = await streamText({
          model: googleClient,
          experimental_providerMetadata: {
            metadata: {
              userId: user.id,
              chatThreadId: threadUuid,
            },
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
              // remove context from lastUserMessage
              if (lastUserMessage) {
                lastUserMessage.content =
                  typeof lastUserMessage.content === "string"
                    ? lastUserMessage.content.replace(
                        /<context>([\s\S]*?)<\/context>/g,
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

              console.log("results", results);

              const newMessages = [
                ...coreMessages,
                {
                  role: "assistant",
                  content:
                    completion.text +
                    `<context>[${JSON.stringify(results)}]</context>`,
                },
              ];
              await data.close();

              if (threadUuid) {
                await database(c.env.HYPERDRIVE.connectionString)
                  .update(chatThreads)
                  .set({ messages: newMessages })
                  .where(eq(chatThreads.uuid, threadUuid));
              }
            } catch (error) {
              console.error("Failed to update thread:", error);
              // Continue execution - the message was delivered even if saving failed
            }
          },
        });

        const streamEnd = performance.now();
        console.log(`Stream response took ${streamEnd - streamStart}ms`);

        const data = new StreamData();

        const context = results.map((r) => ({
          similarity: r.similarity,
          id: r.id,
          content: r.content,
          type: r.type,
          url: r.url,
          title: r.title,
          description: r.description,
          ogImage: r.ogImage,
          userId: r.userId,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt?.toISOString() || null,
        }));
        // Full context objects in the data
        data.appendMessageAnnotation(context);

        return result.toDataStreamResponse({
          headers: {
            "Supermemory-Thread-Uuid": threadUuid,
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

        // Handle database connection errors
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

    if (recentLearnings.length === 0) {
      return c.json({ suggestedLearnings: [] });
    }

    // for each document, i want to generate a list of
    // small markdown tweet-like things that the user might want to remember about
    const suggestedLearnings = await Promise.all(
      recentLearnings.map(async (document) => {
        const model = openai(c.env).chat("gpt-4o-mini-2024-07-18");
        const prompt = `Generate a concise topic recall card for this document. The card should:
  - Have a clear title that captures the main topic
  - Include a brief "Last week, you saved notes on..." intro (do something different every time.)
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
      })
    ),
    async (c) => {
      const { query, limit, threshold } = c.req.valid("json");
      const user = c.get("user");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const openAi = openai(c.env, c.env.OPEN_AI_API_KEY);

      try {
        // Generate embedding for the search query
        const model = openAi.embedding("text-embedding-3-small");

        const embeddings = await embed({ model, value: query });

        if (!embeddings.embedding) {
          return c.json(
            { error: "Failed to generate embedding for query" },
            500
          );
        }

        // Perform semantic search using cosine similarity
        const results = await database(c.env.HYPERDRIVE.connectionString)
          .select({
            id: documents.id,
            uuid: documents.uuid,
            content: documents.content,
            createdAt: documents.createdAt,
            chunkContent: chunk.textContent,
            similarity: sql<number>`1 - (embeddings <=> ${JSON.stringify(
              embeddings.embedding
            )}::vector)`,
          })
          .from(chunk)
          .innerJoin(documents, eq(chunk.documentId, documents.id))
          .where(
            and(
              eq(documents.userId, user.id),
              sql`1 - (embeddings <=> ${JSON.stringify(embeddings.embedding)}::vector) >= ${threshold}`
            )
          )
          .orderBy(
            sql`1 - (embeddings <=> ${JSON.stringify(embeddings.embedding)}::vector) desc`
          ) //figure out a better way to do order by my brain isn't working at this time. but youcan't do vector search twice
          .limit(limit);

        return c.json({
          results: results.map((r) => ({
            ...r,
            similarity: Number(r.similarity.toFixed(4)),
          })),
        });
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
