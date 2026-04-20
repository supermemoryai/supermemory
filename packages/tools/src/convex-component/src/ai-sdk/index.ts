/**
 * Supermemory AI SDK Integration for Convex
 *
 * Integrate Supermemory with Vercel AI SDK using Convex as the backend.
 * Provides both middleware (automatic context injection) and tools (agent-based memory).
 *
 * @example Middleware approach (automatic memory)
 * ```typescript
 * import { generateText } from "ai";
 * import { openai } from "@ai-sdk/openai";
 * import { withSupermemory } from "@supermemory/convex-component/ai-sdk";
 * import { ConvexHttpClient } from "convex/browser";
 *
 * const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
 * const modelWithMemory = withSupermemory(openai("gpt-4"), convex, "user_123");
 *
 * const result = await generateText({
 *   model: modelWithMemory,
 *   messages: [{ role: "user", content: "What do you know about me?" }]
 * });
 * ```
 *
 * @example Tools approach (AI controls memory)
 * ```typescript
 * import { streamText } from "ai";
 * import { openai } from "@ai-sdk/openai";
 * import { supermemoryConvexTools } from "@supermemory/convex-component/ai-sdk";
 * import { ConvexHttpClient } from "convex/browser";
 *
 * const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
 *
 * const result = await streamText({
 *   model: openai("gpt-4"),
 *   prompt: "Remember that I love TypeScript",
 *   tools: supermemoryConvexTools(convex, "user_123")
 * });
 * ```
 */

export {
  withSupermemory,
  type SupermemoryOptions,
  type MemoryPromptData,
} from "./middleware";

export {
  supermemoryConvexTools,
  searchMemoriesTool,
  addMemoryTool,
} from "./tools";
