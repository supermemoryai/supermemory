import { z } from "zod";
import { Hono } from "hono";
import { CoreMessage, streamText } from "ai";
import { chatObj, Env, vectorObj } from "./types";
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
import chunkText from "./utils/chonker";
import { systemPrompt, template } from "./prompts/prompt1";
import { swaggerUI } from "@hono/swagger-ui";

const app = new Hono<{ Bindings: Env }>();

app.get(
  "/ui",
  swaggerUI({
    url: "/doc",
  }),
);

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

app.post("/api/add", zValidator("json", vectorObj), async (c) => {
  const body = c.req.valid("json");

  const { store } = await initQuery(c);

  await batchCreateChunksAndEmbeddings({
    store,
    body,
    chunks: chunkText(body.pageContent, 1536),
    context: c,
  });

  return c.json({ status: "ok" });
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
      space: z.string().optional(),
      url: z.string(),
      user: z.string(),
    }),
    (c) => {
      console.log(c);
    },
  ),
  async (c) => {
    const body = c.req.valid("form");

    const { store } = await initQuery(c);

    if (!(body.images || body["images[]"])) {
      return c.json({ status: "error", message: "No images found" }, 400);
    }

    const imagePromises = (body.images ?? body["images[]"]).map(
      async (image) => {
        const buffer = await image.arrayBuffer();
        const input = {
          image: [...new Uint8Array(buffer)],
          prompt:
            "What's in this image? caption everything you see in great detail",
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

    await batchCreateChunksAndEmbeddings({
      store,
      body,
      chunks: [
        imageDescriptions,
        ...(body.text ? chunkText(body.text, 1536) : []),
      ].flat(),
      context: c,
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

    const { model } = await initQuery(c);

    const response = await streamText({ model, prompt: query.query });
    const r = response.toTextStreamResponse();

    return r;
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
    }),
  ),
  zValidator("json", chatObj),
  async (c) => {
    const query = c.req.valid("query");
    const body = c.req.valid("json");

    const sourcesOnly = query.sourcesOnly === "true";
    const spaces = query.spaces?.split(",") ?? [undefined];

    // Get the AI model maker and vector store
    const { model, store } = await initQuery(c, query.model);

    const filter: VectorizeVectorMetadataFilter = { user: query.user };
    console.log("Spaces", spaces);

    // Converting the query to a vector so that we can search for similar vectors
    const queryAsVector = await store.embeddings.embedQuery(query.query);
    const responses: VectorizeMatches = { matches: [], count: 0 };

    console.log("hello world", spaces);

    // SLICED to 5 to avoid too many queries
    for (const space of spaces.slice(0, 5)) {
      console.log("space", space);
      if (!space && spaces.length > 1) {
        // it's possible for space list to be [undefined] so we only add space filter conditionally
        filter.space = space;
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

    // So this is kinda hacky, but the frontend needs to do 2 calls to get sources and chat.
    // I think this is fine for now, but we can improve this later.
    if (sourcesOnly) {
      const idsAsStrings = sortedHighScoreData.map((dataPoint) =>
        dataPoint.id.toString(),
      );

      // We are getting the content ID back, so that the frontend can show the actual sources properly.
      // it IS a lot of DB calls, i completely agree.
      // TODO: return metadata value here, so that the frontend doesn't have to re-fetch anything.
      const storedContent = await Promise.all(
        idsAsStrings.map(async (id) => await c.env.KV.get(id)),
      );

      const metadata = normalizedData.map((datapoint) => datapoint.metadata);

      return c.json({ ids: storedContent, metadata });
    }

    const preparedContext = normalizedData.map(
      ({ metadata, score, normalizedScore }) => ({
        context: `Website title: ${metadata!.title}\nDescription: ${metadata!.description}\nURL: ${metadata!.url}\nContent: ${metadata!.text}`,
        score,
        normalizedScore,
      }),
    );

    const initialMessages: CoreMessage[] = [
      { role: "user", content: systemPrompt },
      { role: "assistant", content: "Hello, how can I help?" },
    ];

    const prompt = template({
      contexts: preparedContext,
      question: query.query,
    });

    const userMessage: CoreMessage = { role: "user", content: prompt };

    const response = await streamText({
      model,
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

    const { store } = await initQuery(c);

    await deleteDocument({ url: websiteUrl, user, c, store });

    return c.json({ message: "Document deleted" });
  },
);

export default app;
