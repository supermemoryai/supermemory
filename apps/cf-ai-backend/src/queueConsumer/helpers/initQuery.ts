import { Env } from "../../types";
import { OpenAIEmbeddings } from "../../utils/OpenAIEmbedder";
import { CloudflareVectorizeStore } from "@langchain/cloudflare";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";

export async function initQQuery(
	env: Env,
	model: string = "gpt-4o",
) {
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