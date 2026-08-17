import { afterEach, describe, expect, it, vi } from "vitest"
import {
	createSupermemoryContext,
	enhanceMessagesWithMemories,
} from "./middleware"
import type { VoltAgentMessage } from "./types"

const userMessage: VoltAgentMessage = {
	role: "user",
	content: "Hello",
}

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

describe("enhanceMessagesWithMemories", () => {
	it("caches an empty profile result without injecting a system message", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				profile: { static: [], dynamic: [] },
				searchResults: { results: [] },
			}),
		})
		vi.stubGlobal("fetch", fetchMock)
		const context = createSupermemoryContext("user-123", {
			apiKey: "test-api-key",
			customId: "conversation-123",
			mode: "profile",
			addMemory: "never",
		})

		const firstResult = await enhanceMessagesWithMemories(
			[userMessage],
			context,
		)
		const continuation: VoltAgentMessage[] = [
			userMessage,
			{ role: "assistant", content: "Hi there!" },
		]
		const secondResult = await enhanceMessagesWithMemories(
			continuation,
			context,
		)

		expect(firstResult).toEqual([userMessage])
		expect(secondResult).toEqual(continuation)
		expect(context.memoryCache.size).toBe(1)
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it("does not inject a placeholder for an empty advanced search", async () => {
		const promptTemplate = vi.fn(() => "<memories></memories>")
		const context = createSupermemoryContext("user-123", {
			apiKey: "test-api-key",
			customId: "conversation-123",
			mode: "query",
			addMemory: "never",
			limit: 5,
			promptTemplate,
		})
		const search = vi
			.spyOn(context.client.search, "memories")
			.mockResolvedValue({ results: [] } as never)

		const result = await enhanceMessagesWithMemories([userMessage], context)
		const continuation: VoltAgentMessage[] = [
			userMessage,
			{ role: "assistant", content: "Hi there!" },
		]
		const continuationResult = await enhanceMessagesWithMemories(
			continuation,
			context,
		)

		expect(result).toEqual([userMessage])
		expect(continuationResult).toEqual(continuation)
		expect(search).toHaveBeenCalledTimes(1)
		expect(promptTemplate).not.toHaveBeenCalled()
	})

	it("still injects non-empty advanced search results", async () => {
		const context = createSupermemoryContext("user-123", {
			apiKey: "test-api-key",
			customId: "conversation-123",
			mode: "query",
			addMemory: "never",
			searchMode: "hybrid",
		})
		vi.spyOn(context.client.search, "memories").mockResolvedValue({
			results: [{ chunk: "A relevant document chunk" }],
		} as never)

		const result = await enhanceMessagesWithMemories([userMessage], context)

		expect(result[0]).toEqual(
			expect.objectContaining({
				role: "system",
				content: expect.stringContaining("A relevant document chunk"),
			}),
		)
	})
})
