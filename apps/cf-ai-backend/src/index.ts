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

const app = new Hono<{ Bindings: Env }>();

// ------- MIDDLEWARES -------
app.use("*", poweredBy());
app.use("*", timing());
app.use("*", logger());

app.use("/api/", async (c, next) => {
  const auth = bearerAuth({ token: c.env.SECURITY_KEY });
  return auth(c, next);
});
// ------- MIDDLEWARES END -------

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

app.post(
  "/api/chat",
  zValidator(
    "query",
    z.object({
      query: z.string(),
      topK: z.number().optional().default(10),
      user: z.string(),
      spaces: z.string().optional(),
      sourcesOnly: z.string().optional().default("false"),
      model: z.string().optional().default("gpt-4o"),
    }),
  ),
  zValidator("json", chatObj),
  async (c) => {
    const query = c.req.valid("query");
    const body = c.req.valid("json");

    if (body.chatHistory) {
      body.chatHistory = body.chatHistory.map((i) => ({
        ...i,
        content: i.parts.length > 0 ? i.parts.join(" ") : i.content,
      }));
    }

    const sourcesOnly = query.sourcesOnly === "true";
    const spaces = query.spaces?.split(",") || [undefined];

    const { model, store } = await initQuery(c, query.model);

    const filter: VectorizeVectorMetadataFilter = { user: query.user };

    const queryAsVector = await store.embeddings.embedQuery(query.query);
    const responses: VectorizeMatches = { matches: [], count: 0 };

    for (const space of spaces) {
      if (space !== undefined) {
        filter.space = space;
      }

      const resp = await c.env.VECTORIZE_INDEX.query(queryAsVector, {
        topK: query.topK,
        filter,
      });

      if (resp.count > 0) {
        responses.matches.push(...resp.matches);
        responses.count += resp.count;
      }
    }

    const minScore = Math.min(...responses.matches.map(({ score }) => score));
    const maxScore = Math.max(...responses.matches.map(({ score }) => score));

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
    if (highScoreData.length === 0) {
      highScoreData = normalizedData
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
    }

    const sortedHighScoreData = highScoreData.sort(
      (a, b) => b.normalizedScore - a.normalizedScore,
    );

    console.log(JSON.stringify(sortedHighScoreData));

    if (sourcesOnly) {
      const idsAsStrings = sortedHighScoreData.map((dataPoint) =>
        dataPoint.id.toString(),
      );

      const storedContent = await Promise.all(
        idsAsStrings.map(async (id) => await c.env.KV.get(id)),
      );

      return c.json({ ids: storedContent });
    }

    const vec = await c.env.VECTORIZE_INDEX.getByIds(
      sortedHighScoreData.map(({ id }) => id),
    );

    const vecWithScores = vec.map((v, i) => ({
      ...v,
      score: sortedHighScoreData[i].score,
    }));

    const preparedContext = vecWithScores.map(({ metadata, score }) => ({
      context: `Website title: ${metadata!.title}\nDescription: ${metadata!.description}\nURL: ${metadata!.url}\nContent: ${metadata!.text}`,
      score,
    }));

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
      temperature: 0.4,
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
