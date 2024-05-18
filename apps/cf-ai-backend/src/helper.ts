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

  const DEFAULT_MODEL = "gpt-4o";

  let selectedModel:
    | ReturnType<ReturnType<typeof createOpenAI>>
    | ReturnType<ReturnType<typeof createGoogleGenerativeAI>>
    | ReturnType<ReturnType<typeof createAnthropic>>;

  switch (model) {
    case "claude-3-opus":
      const anthropic = createAnthropic({
        apiKey: c.env.ANTHROPIC_API_KEY,
      });
      selectedModel = anthropic.chat("claude-3-opus-20240229");
      console.log("Selected model: ", selectedModel);
      break;
    case "gemini-1.5-pro":
      const googleai = createGoogleGenerativeAI({
        apiKey: c.env.GOOGLE_AI_API_KEY,
      });
      selectedModel = googleai.chat("models/gemini-1.5-pro-latest");
      console.log("Selected model: ", selectedModel);
      break;
    case "gpt-4o":
    default:
      const openai = createOpenAI({
        apiKey: c.env.OPENAI_API_KEY,
      });
      selectedModel = openai.chat("gpt-4o");
      break;
  }

  if (!selectedModel) {
    throw new Error(
      `Model ${model} not found and default model ${DEFAULT_MODEL} is also not available.`,
    );
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
  const toBeDeleted = `${url}-${user}`;
  const random = seededRandom(toBeDeleted);

  const uuid =
    random().toString(36).substring(2, 15) +
    random().toString(36).substring(2, 15);

  await c.env.KV.list({ prefix: uuid }).then(async (keys) => {
    for (const key of keys.keys) {
      await c.env.KV.delete(key.name);
      await store.delete({ ids: [key.name] });
    }
  });
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
  const ourID = `${body.url}-${body.user}`;

  await deleteDocument({ url: body.url, user: body.user, c: context, store });

  const random = seededRandom(ourID);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const uuid =
      random().toString(36).substring(2, 15) +
      random().toString(36).substring(2, 15) +
      "-" +
      i;

    const newPageContent = `Title: ${body.title}\nDescription: ${body.description}\nURL: ${body.url}\nContent: ${chunk}`;

    const docs = await store.addDocuments(
      [
        {
          pageContent: newPageContent,
          metadata: {
            title: body.title?.slice(0, 50) ?? "",
            description: body.description ?? "",
            space: body.space ?? "",
            url: body.url,
            user: body.user,
          },
        },
      ],
      {
        ids: [uuid],
      },
    );

    console.log("Docs added: ", docs);

    await context.env.KV.put(uuid, ourID);
  }
}
