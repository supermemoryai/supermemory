/**
 * Unit tests for the buildMemoriesText function with searchMode support
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
	buildMemoriesText,
	type BuildMemoriesTextOptions,
} from "../../src/shared/memory-client"
import { createLogger } from "../../src/shared/logger"
import "dotenv/config"

// Track mock instances
let mockSearchDocuments: ReturnType<typeof vi.fn>
let mockSearchMemories: ReturnType<typeof vi.fn>
let supermemoryConstructorCalls: any[] = []

// Mock the Supermemory SDK
vi.mock("supermemory", () => {
	return {
		default: vi.fn().mockImplementation((config: any) => {
			supermemoryConstructorCalls.push(config)
			return {
				search: {
					documents: mockSearchDocuments,
					memories: mockSearchMemories,
				},
			}
		}),
	}
})

describe("buildMemoriesText with searchMode", () => {
	let originalFetch: typeof globalThis.fetch
	let fetchMock: ReturnType<typeof vi.fn>
	const logger = createLogger(false)

	const createMockProfileResponse = (
		staticMemories: string[] = [],
		dynamicMemories: string[] = [],
		searchResults: string[] = [],
	) => ({
		profile: {
			static: staticMemories.map((memory) => ({ memory })),
			dynamic: dynamicMemories.map((memory) => ({ memory })),
		},
		searchResults: {
			results: searchResults.map((memory) => ({ memory })),
		},
	})

	beforeEach(() => {
		originalFetch = globalThis.fetch
		fetchMock = vi.fn()
		globalThis.fetch = fetchMock as unknown as typeof fetch

		// Reset mocks
		mockSearchDocuments = vi.fn().mockResolvedValue({ results: [] })
		mockSearchMemories = vi.fn().mockResolvedValue({ results: [] })
		supermemoryConstructorCalls = []
		vi.clearAllMocks()
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	describe("searchMode: memories (default)", () => {
		it("should call profile API AND search.memories when searchMode is memories", async () => {
			// Mock profile API response
			fetchMock.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve(
						createMockProfileResponse(["User profile fact"], [], []),
					),
			})

			// Mock search.memories response
			mockSearchMemories.mockResolvedValue({
				results: [
					{ memory: "Memory about TypeScript" },
					{ memory: "Memory about React" },
				],
			})

			const options: BuildMemoriesTextOptions = {
				containerTag: "test-user",
				queryText: "test query",
				mode: "full",
				baseUrl: "https://api.supermemory.ai",
				apiKey: "test-key",
				logger,
				searchMode: "memories",
			}

			const result = await buildMemoriesText(options)

			// Should call profile API (controlled by mode)
			expect(fetchMock).toHaveBeenCalledTimes(1)

			// Should instantiate Supermemory SDK and call search.memories
			expect(supermemoryConstructorCalls.length).toBe(1)
			expect(mockSearchMemories).toHaveBeenCalledWith({
				q: "test query",
				containerTag: "test-user",
				limit: 10,
				include: { chunks: false },
			})

			// Should NOT call search.documents
			expect(mockSearchDocuments).not.toHaveBeenCalled()

			// Result should contain both profile AND search memories
			expect(result).toContain("User profile fact")
			expect(result).toContain("Memory about TypeScript")
			expect(result).toContain("Memory about React")
		})
	})

	describe("searchMode: hybrid", () => {
		it("should call profile API AND both search.memories and search.documents", async () => {
			// Mock profile API response
			fetchMock.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve(
						createMockProfileResponse(["User likes coding"], [], []),
					),
			})

			// Mock search.memories
			mockSearchMemories.mockResolvedValue({
				results: [{ memory: "Memory about coding preferences" }],
			})

			// Mock search.documents
			mockSearchDocuments.mockResolvedValue({
				results: [
					{
						documentId: "doc-1",
						chunks: [
							{
								content: "Document chunk about TypeScript best practices",
								isRelevant: true,
							},
							{ content: "Another chunk about React", isRelevant: true },
						],
					},
				],
			})

			const options: BuildMemoriesTextOptions = {
				containerTag: "test-user",
				queryText: "TypeScript tips",
				mode: "full",
				baseUrl: "https://api.supermemory.ai",
				apiKey: "test-key",
				logger,
				searchMode: "hybrid",
				searchLimit: 5,
			}

			const result = await buildMemoriesText(options)

			// Should call profile API (controlled by mode)
			expect(fetchMock).toHaveBeenCalledTimes(1)

			// Should instantiate Supermemory SDK
			expect(supermemoryConstructorCalls.length).toBe(1)
			expect(supermemoryConstructorCalls[0]).toEqual({
				apiKey: "test-key",
			})

			// Should call BOTH search.memories and search.documents
			expect(mockSearchMemories).toHaveBeenCalledWith({
				q: "TypeScript tips",
				containerTag: "test-user",
				limit: 5,
				include: { chunks: false },
			})
			expect(mockSearchDocuments).toHaveBeenCalledWith({
				q: "TypeScript tips",
				containerTags: ["test-user"],
				limit: 5,
			})

			// Result should contain profile, memories, and document chunks
			expect(result).toContain("User likes coding")
			expect(result).toContain("Memory about coding preferences")
			expect(result).toContain("Document chunk about TypeScript best practices")
			expect(result).toContain("Another chunk about React")
		})
	})

	describe("searchMode: documents", () => {
		it("should call profile API and search.documents for chunks only", async () => {
			// Mock profile API
			fetchMock.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve(
						createMockProfileResponse(["User profile fact"], [], []),
					),
			})

			// Mock Supermemory search.documents
			mockSearchDocuments.mockResolvedValue({
				results: [
					{
						documentId: "doc-1",
						chunks: [
							{ content: "RAG chunk 1", isRelevant: true },
							{ content: "RAG chunk 2", isRelevant: true },
							{ content: "Irrelevant chunk", isRelevant: false },
						],
					},
				],
			})

			const options: BuildMemoriesTextOptions = {
				containerTag: "test-user",
				queryText: "What's in my documents?",
				mode: "full",
				baseUrl: "https://api.supermemory.ai",
				apiKey: "test-key",
				logger,
				searchMode: "documents",
				searchLimit: 10,
			}

			const result = await buildMemoriesText(options)

			// Should call profile API
			expect(fetchMock).toHaveBeenCalledTimes(1)

			// Should call search.documents
			expect(mockSearchDocuments).toHaveBeenCalledWith({
				q: "What's in my documents?",
				containerTags: ["test-user"],
				limit: 10,
			})

			// Result should contain profile and relevant chunks only
			expect(result).toContain("User profile fact")
			expect(result).toContain("RAG chunk 1")
			expect(result).toContain("RAG chunk 2")
			// Irrelevant chunk should NOT be included
			expect(result).not.toContain("Irrelevant chunk")
		})
	})

	describe("searchLimit option", () => {
		it("should use default searchLimit of 10", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(createMockProfileResponse([], [], [])),
			})

			mockSearchMemories.mockResolvedValue({ results: [] })
			mockSearchDocuments.mockResolvedValue({ results: [] })

			const options: BuildMemoriesTextOptions = {
				containerTag: "test-user",
				queryText: "test",
				mode: "full",
				baseUrl: "https://api.supermemory.ai",
				apiKey: "test-key",
				logger,
				searchMode: "hybrid",
				// searchLimit not specified - should default to 10
			}

			await buildMemoriesText(options)

			expect(mockSearchMemories).toHaveBeenCalledWith(
				expect.objectContaining({ limit: 10 }),
			)
		})

		it("should use custom searchLimit when specified", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(createMockProfileResponse([], [], [])),
			})

			mockSearchDocuments.mockResolvedValue({ results: [] })

			const options: BuildMemoriesTextOptions = {
				containerTag: "test-user",
				queryText: "test",
				mode: "full",
				baseUrl: "https://api.supermemory.ai",
				apiKey: "test-key",
				logger,
				searchMode: "documents",
				searchLimit: 25,
			}

			await buildMemoriesText(options)

			expect(mockSearchDocuments).toHaveBeenCalledWith(
				expect.objectContaining({ limit: 25 }),
			)
		})
	})

	describe("edge cases", () => {
		it("should call profile API but not search APIs when queryText is empty", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve(createMockProfileResponse(["Profile only"], [], [])),
			})

			const options: BuildMemoriesTextOptions = {
				containerTag: "test-user",
				queryText: "", // Empty query
				mode: "profile",
				baseUrl: "https://api.supermemory.ai",
				apiKey: "test-key",
				logger,
				searchMode: "documents",
			}

			const result = await buildMemoriesText(options)

			// Should call profile API (mode controls this)
			expect(fetchMock).toHaveBeenCalledTimes(1)

			// Should NOT instantiate Supermemory SDK when no query
			expect(supermemoryConstructorCalls.length).toBe(0)
			expect(mockSearchDocuments).not.toHaveBeenCalled()

			// Should still return profile
			expect(result).toContain("Profile only")
		})

		it("should handle custom baseUrl correctly", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(createMockProfileResponse([], [], [])),
			})

			mockSearchMemories.mockResolvedValue({ results: [] })

			const options: BuildMemoriesTextOptions = {
				containerTag: "test-user",
				queryText: "test",
				mode: "full",
				baseUrl: "https://custom.api.example.com",
				apiKey: "test-key",
				logger,
				searchMode: "hybrid",
			}

			await buildMemoriesText(options)

			// Profile API should use custom base URL
			expect(fetchMock).toHaveBeenCalledWith(
				"https://custom.api.example.com/v4/profile",
				expect.any(Object),
			)

			// Supermemory SDK should be configured with custom base URL
			expect(supermemoryConstructorCalls.length).toBe(1)
			expect(supermemoryConstructorCalls[0]).toEqual({
				apiKey: "test-key",
				baseURL: "https://custom.api.example.com",
			})
		})
	})
})
