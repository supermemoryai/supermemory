import { tool } from "ai";
import { z } from "zod";
import type { ConvexClient } from "convex/browser";
import type { FunctionReference } from "convex/server";

/**
 * Supermemory AI SDK Tools for Convex
 *
 * Provides AI agent tools that use Convex actions for memory operations.
 * All operations are cached and tracked in the Convex dashboard.
 */

/**
 * Create Supermemory tools for AI agents using Convex backend
 *
 * @param convexClient - Your Convex client instance
 * @param containerTag - User/session identifier for memory isolation
 * @param componentPath - Path to the component in your Convex config (default: "supermemory")
 *
 * @example
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
export function supermemoryConvexTools(
  convexClient: ConvexClient,
  containerTag: string,
  componentPath: string = "supermemory"
): any {
  const addAction = `${componentPath}:add` as unknown as FunctionReference<"action">;
  const searchAction = `${componentPath}:search` as unknown as FunctionReference<"action">;

  return {
    /**
     * Search through user's memories using semantic search
     * The AI agent calls this when it needs to recall information
     */
    // @ts-ignore - AI SDK v4 tool type compatibility
    searchMemories: tool({
      description:
        "Search through the user's memories and past conversations. Use this to recall information the user has shared previously, their preferences, or relevant context from past interactions.",
      parameters: z.object({
        informationToGet: z
          .string()
          .describe(
            "What information you're looking for. Be specific and use natural language (e.g., 'user dietary preferences', 'previous conversation about TypeScript')"
          ),
        limit: z
          .number()
          .optional()
          .describe("Maximum number of memories to retrieve (default: 5)"),
      }),
      // @ts-expect-error - AI SDK v4 tool type compatibility
      execute: async ({ informationToGet, limit = 5 }: { informationToGet: string; limit?: number }) => {
        try {
          const result = await convexClient.action(searchAction, {
            q: informationToGet,
            containerTag,
            searchMode: "hybrid" as const,
            limit,
          });

          if (!result || result.results.length === 0) {
            return {
              success: true,
              results: [],
              count: 0,
              message: "No relevant memories found",
            };
          }

          return {
            success: true,
            results: result.results.map((r: any) => ({
              content: r.memory || r.chunk,
              similarity: r.similarity,
              metadata: r.metadata,
            })),
            count: result.total,
            cached: result.cached,
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Search failed",
            results: [],
            count: 0,
          };
        }
      },
    }),

    /**
     * Add new information to user's memory
     * The AI agent calls this when the user shares important information
     */
    // @ts-ignore - AI SDK v4 tool type compatibility
    addMemory: tool({
      description:
        "Store new information about the user that should be remembered for future conversations. Use this when the user shares preferences, facts about themselves, or important context that should be recalled later.",
      parameters: z.object({
        memory: z
          .string()
          .describe(
            "The information to remember. Be clear and concise. Store facts, not full conversations (e.g., 'User is allergic to peanuts', 'User prefers dark mode')"
          ),
        customId: z
          .string()
          .optional()
          .describe(
            "Optional unique identifier for this memory (useful for updating existing memories)"
          ),
        metadata: z
          .record(z.string(), z.any())
          .optional()
          .describe("Optional metadata for categorization or filtering"),
      }),
      // @ts-expect-error - AI SDK v4 tool type compatibility
      execute: async ({ memory, customId, metadata }: { memory: string; customId?: string; metadata?: Record<string, any> }) => {
        try {
          const result = await convexClient.action(addAction, {
            content: memory,
            containerTag,
            customId,
            metadata,
          });

          return {
            success: true,
            memory: {
              id: result.id,
              status: result.status,
            },
            message: "Memory stored successfully",
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to add memory",
          };
        }
      },
    }),
  };
}

/**
 * Individual tool exports for more granular control
 */

export function searchMemoriesTool(
  convexClient: ConvexClient,
  containerTag: string,
  componentPath: string = "supermemory"
) {
  return supermemoryConvexTools(convexClient, containerTag, componentPath)
    .searchMemories;
}

export function addMemoryTool(
  convexClient: ConvexClient,
  containerTag: string,
  componentPath: string = "supermemory"
) {
  return supermemoryConvexTools(convexClient, containerTag, componentPath)
    .addMemory;
}
