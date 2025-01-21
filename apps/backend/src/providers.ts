import { createOpenAI, OpenAIProvider } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { Env } from "./types";

export function openai(
  env: Env,
  apiKey?: string
): ReturnType<typeof createOpenAI> {
  return createOpenAI({
    apiKey: apiKey || env.OPEN_AI_API_KEY,
    baseURL: "https://gateway.ai.cloudflare.com/v1/47c2b4d598af9d423c06fc9f936226d5/supermemory/openai"
  });
}

export function google(securityKey: string) {
  return createGoogleGenerativeAI({
    apiKey: securityKey,
  });
}
