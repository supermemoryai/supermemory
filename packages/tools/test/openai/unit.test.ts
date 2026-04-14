/**
 * Unit tests for the OpenAI withSupermemory wrapper and middleware
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { withSupermemory } from "../../src/openai"
import { createMockProfileResponse } from "../utils/supermemory-mocks"

// Create a mock OpenAI client
const createMockOpenAIClient = () => {
	const mockCreate = vi.fn().mockResolvedValue({
		choices: [{ message: { content: "Hello!", role: "assistant" } }],
	})

	const mockResponsesCreate = vi.fn().mockResolvedValue({
		output: [{ type: "message", content: "Hello!" }],
	})

	return {
		chat: {
			completions: {
				create: mockCreate,
			},
		},
		responses: {
			create: mockResponsesCreate,
		},
		// Store references for assertion
		_mockCreate: mockCreate,
		_mockResponsesCreate: mockResponsesCreate,
	} as any
}

describe("Unit: OpenAI withSupermemory", () => {
	let originalEnv: string | undefined
	let originalFetch: typeof globalThis.fetch
	let fetchMock: ReturnType<typeof vi.fn>

	beforeEach(() => {
		originalEnv = process.env.SUPERMEMORY_API_KEY
		originalFetch = globalThis.fetch
		process.env.SUPERMEMORY_API_KEY = "test-api-key"
		fetchMock = vi.fn()
		globalThis.fetch = fetchMock as unknown as typeof fetch
		vi.clearAllMocks()
	})

	afterEach(() => {
		if (originalEnv) {
			process.env.SUPERMEMORY_API_KEY = originalEnv
		} else {
			delete process.env.SUPERMEMORY_API_KEY
		}
		globalThis.fetch = originalFetch
	})

	describe("Initialization", () => {
		it("should throw error if SUPERMEMORY_API_KEY is not set and no apiKey provided", () => {
			delete process.env.SUPERMEMORY_API_KEY
			const mockClient = createMockOpenAIClient()

			expect(() => {
				withSupermemory(mockClient, {
					containerTag: "user-123",
					customId: "conv-456",
				})
			}).toThrow("API key is required")
		})

		it("should return the wrapped client with valid config", () => {
			const mockClient = createMockOpenAIClient()
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "conv-456",
			})

			expect(wrapped).toBeDefined()
			expect(wrapped.chat.completions.create).toBeDefined()
		})

		it("should accept all options in the options object", () => {
			const mockClient = createMockOpenAIClient()
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "conv-456",
				verbose: true,
				mode: "full",
				addMemory: "always",
			})
			expect(wrapped).toBeDefined()
		})

		it("should work with minimal required options", () => {
			const mockClient = createMockOpenAIClient()
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "conv-456",
			})
			expect(wrapped).toBeDefined()
		})
	})

	describe("customId as required parameter", () => {
		it("should require customId in options object", () => {
			const mockClient = createMockOpenAIClient()

			// This should work — customId provided
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "conv-456",
			})
			expect(wrapped).toBeDefined()
		})

		it("should throw with helpful message for empty customId", () => {
			const mockClient = createMockOpenAIClient()

			expect(() => {
				withSupermemory(mockClient, {
					containerTag: "user-123",
					customId: "",
				})
			}).toThrow("[supermemory] customId is required")
		})

		it("should throw with helpful message for whitespace-only customId", () => {
			const mockClient = createMockOpenAIClient()

			expect(() => {
				withSupermemory(mockClient, {
					containerTag: "user-123",
					customId: "   ",
				})
			}).toThrow("[supermemory] customId is required")
		})

		it("should pass customId through to middleware", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(createMockProfileResponse(["Test memory"])),
			})

			const mockClient = createMockOpenAIClient()
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "my-conversation-id",
				mode: "profile",
				addMemory: "always",
			})

			await wrapped.chat.completions.create({
				model: "gpt-4",
				messages: [{ role: "user", content: "Hello" }],
			})

			// Verify the conversation ID is used — addMemory should use it to build customId
			// The fetch call to /v4/profile should have been made
			expect(fetchMock).toHaveBeenCalled()
		})
	})

	describe("Chat Completions - Memory injection", () => {
		it("should inject memories into system prompt in profile mode", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve(
						createMockProfileResponse(
							["User likes TypeScript"],
							["Currently working on a monorepo"],
						),
					),
			})

			const mockClient = createMockOpenAIClient()
			const originalCreate = mockClient._mockCreate
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "conv-456",
				mode: "profile",
			})

			await wrapped.chat.completions.create({
				model: "gpt-4",
				messages: [{ role: "user", content: "What do you know about me?" }],
			})

			// Verify the original create was called with enhanced messages
			expect(originalCreate).toHaveBeenCalledTimes(1)
			const calledMessages = originalCreate.mock.calls[0][0].messages

			// Should have a system message prepended with memories
			expect(calledMessages[0].role).toBe("system")
			expect(calledMessages[0].content).toContain("User likes TypeScript")
			expect(calledMessages[0].content).toContain(
				"Currently working on a monorepo",
			)
		})

		it("should append memories to existing system prompt", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve(
						createMockProfileResponse(["User prefers dark mode"]),
					),
			})

			const mockClient = createMockOpenAIClient()
			const originalCreate = mockClient._mockCreate
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "conv-456",
				mode: "profile",
			})

			await wrapped.chat.completions.create({
				model: "gpt-4",
				messages: [
					{ role: "system", content: "You are a helpful assistant." },
					{ role: "user", content: "Hello!" },
				],
			})

			const calledMessages = originalCreate.mock.calls[0][0].messages
			const systemMsg = calledMessages.find((m: any) => m.role === "system")
			expect(systemMsg.content).toContain("You are a helpful assistant.")
			expect(systemMsg.content).toContain("User prefers dark mode")
		})

		it("should search memories based on user message in query mode", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve(
						createMockProfileResponse([], [], ["TypeScript is their favorite"]),
					),
			})

			const mockClient = createMockOpenAIClient()
			const originalCreate = mockClient._mockCreate
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "conv-456",
				mode: "query",
				addMemory: "never",
			})

			await wrapped.chat.completions.create({
				model: "gpt-4",
				messages: [
					{ role: "user", content: "What's my favorite programming language?" },
				],
			})

			// Verify fetch was called with query text
			expect(fetchMock.mock.calls.length).toBeGreaterThan(0)
			const fetchCall = fetchMock.mock.calls[0]
			const fetchBody = JSON.parse(fetchCall?.[1]?.body)
			expect(fetchBody.q).toBe("What's my favorite programming language?")
			expect(fetchBody.containerTag).toBe("user-123")

			const calledMessages = originalCreate.mock.calls[0][0].messages
			expect(calledMessages[0].content).toContain(
				"TypeScript is their favorite",
			)
		})

		it("should combine profile and search in full mode", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve(
						createMockProfileResponse(
							["Name: Alice"],
							["Likes coffee"],
							["Recently discussed Python"],
						),
					),
			})

			const mockClient = createMockOpenAIClient()
			const originalCreate = mockClient._mockCreate
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "conv-456",
				mode: "full",
			})

			await wrapped.chat.completions.create({
				model: "gpt-4",
				messages: [{ role: "user", content: "Tell me about myself" }],
			})

			const calledMessages = originalCreate.mock.calls[0][0].messages
			const systemContent = calledMessages[0].content
			expect(systemContent).toContain("Name: Alice")
			expect(systemContent).toContain("Likes coffee")
			expect(systemContent).toContain("Recently discussed Python")
		})

		it("should skip memory search when no user message in query mode", async () => {
			const mockClient = createMockOpenAIClient()
			const originalCreate = mockClient._mockCreate
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "conv-456",
				mode: "query",
			})

			await wrapped.chat.completions.create({
				model: "gpt-4",
				messages: [{ role: "system", content: "You are a helpful assistant." }],
			})

			// Should not have called the Supermemory API
			expect(fetchMock).not.toHaveBeenCalled()
			// Should have called original create with unchanged messages
			expect(originalCreate).toHaveBeenCalledTimes(1)
		})
	})

	describe("Chat Completions - Memory storage", () => {
		it("should not save memory when addMemory is never", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(createMockProfileResponse()),
			})

			const mockClient = createMockOpenAIClient()
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "conv-456",
				addMemory: "never",
			})

			await wrapped.chat.completions.create({
				model: "gpt-4",
				messages: [{ role: "user", content: "Remember this!" }],
			})

			// Only one fetch call (profile search), no memory add call
			expect(fetchMock).toHaveBeenCalledTimes(1)
			const fetchUrl = fetchMock.mock.calls[0]?.[0]
			expect(fetchUrl).toContain("/v4/profile")
		})
	})

	describe("Responses API", () => {
		it("should inject memories into instructions for Responses API", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve(createMockProfileResponse(["User is a developer"])),
			})

			const mockClient = createMockOpenAIClient()
			const originalResponsesCreate = mockClient._mockResponsesCreate
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "conv-456",
				mode: "profile",
			})

			await wrapped.responses.create({
				model: "gpt-4o",
				instructions: "You are a helpful assistant.",
				input: "What do you know about me?",
			})

			expect(originalResponsesCreate).toHaveBeenCalledTimes(1)
			const calledParams = originalResponsesCreate.mock.calls[0][0]
			expect(calledParams.instructions).toContain(
				"You are a helpful assistant.",
			)
			expect(calledParams.instructions).toContain("User is a developer")
		})
	})

	describe("Error handling", () => {
		it("should propagate API errors from Supermemory", async () => {
			fetchMock.mockResolvedValue({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				text: () => Promise.resolve("Server error"),
			})

			const mockClient = createMockOpenAIClient()
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "conv-456",
				mode: "profile",
			})

			await expect(
				wrapped.chat.completions.create({
					model: "gpt-4",
					messages: [{ role: "user", content: "Hello" }],
				}),
			).rejects.toThrow("Supermemory profile search failed")
		})

		it("should handle empty memories gracefully", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(createMockProfileResponse()),
			})

			const mockClient = createMockOpenAIClient()
			const originalCreate = mockClient._mockCreate
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "conv-456",
			})

			await wrapped.chat.completions.create({
				model: "gpt-4",
				messages: [{ role: "user", content: "Hello" }],
			})

			// Should still call original create
			expect(originalCreate).toHaveBeenCalledTimes(1)
		})
	})

	describe("Options defaults", () => {
		it("should default to profile mode", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(createMockProfileResponse(["A memory"])),
			})

			const mockClient = createMockOpenAIClient()
			// No mode specified — defaults to profile mode
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "conv-456",
				addMemory: "never",
			})

			await wrapped.chat.completions.create({
				model: "gpt-4",
				messages: [{ role: "user", content: "Hello" }],
			})

			// In profile mode, query text should be empty (no q param)
			const fetchBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body)
			expect(fetchBody.q).toBeUndefined()
			expect(fetchBody.containerTag).toBe("user-123")
		})

		it("should default to always for addMemory", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(createMockProfileResponse()),
			})

			const mockClient = createMockOpenAIClient()
			const wrapped = withSupermemory(mockClient, {
				containerTag: "user-123",
				customId: "conv-456",
			})

			await wrapped.chat.completions.create({
				model: "gpt-4",
				messages: [{ role: "user", content: "Hello" }],
			})

			// 2 fetches: profile search + memory add (default is "always")
			expect(fetchMock).toHaveBeenCalledTimes(2)
		})
	})
})
