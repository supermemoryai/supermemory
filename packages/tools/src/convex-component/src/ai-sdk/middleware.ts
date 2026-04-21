import type { ConvexClient } from "convex/browser"
import type { FunctionReference } from "convex/server"

/**
 * Supermemory AI SDK Middleware for Convex
 *
 * Wraps AI models to automatically inject user context from Supermemory.
 */

/**
 * Minimal language model interface for middleware wrapping.
 * Compatible with Vercel AI SDK's LanguageModelV2/V3 without requiring
 * a direct dependency on @ai-sdk/provider.
 */
interface WrappableLanguageModel {
	// biome-ignore lint/suspicious/noExplicitAny: AI SDK internal types not exported
	doGenerate: (options: any) => Promise<any>
	// biome-ignore lint/suspicious/noExplicitAny: AI SDK internal types not exported
	doStream: (options: any) => Promise<any>
	[key: string]: unknown
}

export interface SupermemoryOptions {
	/**
	 * Memory retrieval mode
	 * - "profile": Get full user profile (static + dynamic facts)
	 * - "query": Search memories based on user's message
	 * - "full": Both profile AND query-based search
	 */
	mode?: "profile" | "query" | "full"

	/**
	 * When to automatically save new memories
	 * - "never": Don't auto-save (default)
	 * - "always": Save every user message
	 * - "tool": Only when AI explicitly calls addMemory tool
	 */
	addMemory?: "never" | "always" | "tool"

	/**
	 * Custom prompt template for formatting memories
	 */
	promptTemplate?: (data: MemoryPromptData) => string

	/**
	 * Enable verbose logging
	 */
	verbose?: boolean
}

export interface MemoryPromptData {
	userMemories: string
	generalSearchMemories: string
	searchResults: unknown[]
}

const DEFAULT_PROMPT_TEMPLATE = (data: MemoryPromptData) =>
	`
# User Context

## User Profile
${data.userMemories}

## Relevant Memories
${data.generalSearchMemories}

Use this context to provide personalized, contextual responses.
`.trim()

/**
 * Wrap an AI model with automatic Supermemory context injection
 *
 * @param model - The base AI model to wrap (any AI SDK language model)
 * @param convexClient - Your Convex client instance
 * @param containerTag - User/session identifier
 * @param options - Configuration options
 * @param componentPath - Path to the component (default: "supermemory")
 *
 * @example
 * ```typescript
 * import { generateText } from "ai";
 * import { openai } from "@ai-sdk/openai";
 * import { withSupermemory } from "@supermemory/convex-component/ai-sdk";
 * import { ConvexHttpClient } from "convex/browser";
 *
 * const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
 *
 * const modelWithMemory = withSupermemory(
 *   openai("gpt-4"),
 *   convex,
 *   "user_123",
 *   { mode: "full", addMemory: "always" }
 * );
 *
 * const result = await generateText({
 *   model: modelWithMemory,
 *   messages: [{ role: "user", content: "What do you know about me?" }]
 * });
 * ```
 */
export function withSupermemory<T extends WrappableLanguageModel>(
	model: T,
	convexClient: ConvexClient,
	containerTag: string,
	options: SupermemoryOptions = {},
	componentPath = "supermemory",
): T {
	const {
		mode = "profile",
		addMemory = "never",
		promptTemplate = DEFAULT_PROMPT_TEMPLATE,
		verbose = false,
	} = options

	const profileAction =
		`${componentPath}:actions.profile` as unknown as FunctionReference<"action">
	const searchAction =
		`${componentPath}:actions.search` as unknown as FunctionReference<"action">
	const addAction =
		`${componentPath}:actions.add` as unknown as FunctionReference<"action">

	return {
		...model,
		// biome-ignore lint/suspicious/noExplicitAny: AI SDK internal types not exported
		doGenerate: async (callOptions: any) => {
			try {
				// Extract user's last message for query-based search
				const lastUserMessage = callOptions.prompt
					// biome-ignore lint/suspicious/noExplicitAny: AI SDK internal types not exported
					.filter((msg: any) => msg.role === "user")
					.slice(-1)[0]

				const userQuery =
					lastUserMessage && "content" in lastUserMessage
						? typeof lastUserMessage.content === "string"
							? lastUserMessage.content
							: lastUserMessage.content
									// biome-ignore lint/suspicious/noExplicitAny: AI SDK internal types not exported
									.map((c: any) => (c.type === "text" ? c.text : ""))
									.join(" ")
						: ""

				let userMemories = ""
				let generalSearchMemories = ""
				let searchResults: unknown[] = []

				// Fetch profile if needed
				if (mode === "profile" || mode === "full") {
					if (verbose) console.log("[Supermemory] Fetching user profile...")

					const profile = await convexClient.action(profileAction, {
						containerTag,
						q: userQuery || undefined,
					})

					userMemories = [
						...profile.profile.static.map((f: string) => `- ${f}`),
						...profile.profile.dynamic.map((f: string) => `- ${f}`),
					].join("\n")

					if (verbose) {
						console.log(
							`[Supermemory] Profile: ${profile.profile.static.length} static, ${profile.profile.dynamic.length} dynamic facts`,
						)
					}
				}

				// Query-based search if needed
				if ((mode === "query" || mode === "full") && userQuery) {
					if (verbose)
						console.log(`[Supermemory] Searching memories for: "${userQuery}"`)

					const searchResult = await convexClient.action(searchAction, {
						q: userQuery,
						containerTag,
						searchMode: "hybrid" as const,
						limit: 5,
					})

					searchResults = searchResult.results
					generalSearchMemories = searchResults
						.map(
							// biome-ignore lint/suspicious/noExplicitAny: search result types not exported
							(r: any) =>
								`- ${r.memory || r.chunk} (similarity: ${r.similarity.toFixed(2)})`,
						)
						.join("\n")

					if (verbose) {
						console.log(
							`[Supermemory] Found ${searchResults.length} relevant memories`,
						)
					}
				}

				// Format context
				const contextPrompt = promptTemplate({
					userMemories,
					generalSearchMemories,
					searchResults,
				})

				// Inject context as system message
				const enhancedPrompt = [
					{ role: "system" as const, content: contextPrompt },
					...callOptions.prompt,
				]

				// Auto-save user message if enabled (fire-and-forget to avoid blocking)
				if (addMemory === "always" && userQuery) {
					if (verbose) console.log("[Supermemory] Auto-saving user message...")

					convexClient
						.action(addAction, {
							content: userQuery,
							containerTag,
							metadata: { source: "ai-middleware", auto: true },
						})
						.catch((e) =>
							console.error("[Supermemory] Failed to auto-save:", e),
						)
				}

				// Call original model with enhanced context
				return await model.doGenerate({
					...callOptions,
					prompt: enhancedPrompt,
				})
			} catch (error) {
				console.error("[Supermemory] Error in middleware:", error)
				// Fallback to original model without context on error
				return await model.doGenerate(callOptions)
			}
		},

		// biome-ignore lint/suspicious/noExplicitAny: AI SDK internal types not exported
		doStream: async (callOptions: any) => {
			// For streaming, we inject context upfront then stream normally
			try {
				const lastUserMessage = callOptions.prompt
					// biome-ignore lint/suspicious/noExplicitAny: AI SDK internal types not exported
					.filter((msg: any) => msg.role === "user")
					.slice(-1)[0]

				const userQuery =
					lastUserMessage && "content" in lastUserMessage
						? typeof lastUserMessage.content === "string"
							? lastUserMessage.content
							: lastUserMessage.content
									// biome-ignore lint/suspicious/noExplicitAny: AI SDK internal types not exported
									.map((c: any) => (c.type === "text" ? c.text : ""))
									.join(" ")
						: ""

				let userMemories = ""
				let generalSearchMemories = ""
				let searchResults: unknown[] = []

				if (mode === "profile" || mode === "full") {
					const profile = await convexClient.action(profileAction, {
						containerTag,
						q: userQuery || undefined,
					})

					userMemories = [
						...profile.profile.static.map((f: string) => `- ${f}`),
						...profile.profile.dynamic.map((f: string) => `- ${f}`),
					].join("\n")
				}

				if ((mode === "query" || mode === "full") && userQuery) {
					const searchResult = await convexClient.action(searchAction, {
						q: userQuery,
						containerTag,
						searchMode: "hybrid" as const,
						limit: 5,
					})

					searchResults = searchResult.results
					generalSearchMemories = searchResults
						// biome-ignore lint/suspicious/noExplicitAny: search result types not exported
						.map((r: any) => `- ${r.memory || r.chunk}`)
						.join("\n")
				}

				const contextPrompt = promptTemplate({
					userMemories,
					generalSearchMemories,
					searchResults,
				})

				const enhancedPrompt = [
					{ role: "system" as const, content: contextPrompt },
					...callOptions.prompt,
				]

				if (addMemory === "always" && userQuery) {
					convexClient
						.action(addAction, {
							content: userQuery,
							containerTag,
							metadata: { source: "ai-middleware", auto: true },
						})
						.catch((e) =>
							console.error("[Supermemory] Failed to auto-save:", e),
						)
				}

				return await model.doStream({
					...callOptions,
					prompt: enhancedPrompt,
				})
			} catch (error) {
				console.error("[Supermemory] Error in streaming middleware:", error)
				return await model.doStream(callOptions)
			}
		},
	} as T
}
