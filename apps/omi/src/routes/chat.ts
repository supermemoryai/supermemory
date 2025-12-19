import type { Context } from "hono"
import type {
	ChatRequest,
	ChatResponse,
	ErrorResponse,
	HonoEnv,
	SearchResult,
} from "../types"
import { createSupermemoryClient } from "../utils"

/**
 * Chat endpoint handler with memory search integration
 */
export async function handleChat(c: Context<HonoEnv>) {
	try {
		const body = await c.req.json<ChatRequest>()
		const { message, userId } = body

		if (!message || !userId) {
			return c.json<ErrorResponse>(
				{
					error: "Missing required fields",
					details: "Both 'message' and 'userId' are required",
				},
				400,
			)
		}

		if (!message.trim()) {
			return c.json<ErrorResponse>({ error: "Message cannot be empty" }, 400)
		}

		const apiKey = c.env.SUPERMEMORY_API_KEY as string | undefined
		const client = createSupermemoryClient(apiKey)

		const searchResponse = await client.search.execute({
			q: message,
			containerTags: [`omi_user_${userId}`],
			limit: 5,
			chunkThreshold: 0.6,
			includeFullDocs: true,
		})

		const memories = searchResponse.results || []

		// Build context from memories
		const memoryContext =
			memories.length > 0
				? `\n\nRelevant memories:\n${memories
						.map((m) => {
							if ("memory" in m && m.memory) return `- ${m.memory}`
							if ("chunk" in m && m.chunk) return `- ${m.chunk}`
							if ("content" in m && m.content) return `- ${m.content}`
							return `- ${JSON.stringify(m)}`
						})
						.join("\n")}`
				: ""

		return c.json<ChatResponse>({
			message,
			memories: memories.length,
			context: memoryContext,
			results: memories as unknown as SearchResult[],
		})
	} catch (error) {
		console.error("Error in chat endpoint:", error)
		return c.json<ErrorResponse>(
			{
				error: "Failed to process chat request",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			500,
		)
	}
}
