/**
 * Unit tests for the Mastra integration
 * Tests processors, wrapper, and factory functions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import {
	RequestContext,
	MASTRA_THREAD_ID_KEY,
} from "@mastra/core/request-context"
import {
	SupermemoryInputProcessor,
	SupermemoryOutputProcessor,
	createSupermemoryProcessor,
	createSupermemoryOutputProcessor,
	createSupermemoryProcessors,
	withSupermemory,
} from "../../src/mastra"
import type {
	ProcessInputArgs,
	ProcessOutputResultArgs,
	MessageList,
	MastraDBMessage,
	MastraMessageContentV2,
	Processor,
} from "../../src/mastra"

const TEST_CONFIG = {
	apiKey: "test-api-key",
	baseUrl: "https://api.supermemory.ai",
	containerTag: "test-mastra-user",
	conversationId: "test-conv-123",
}

interface MockAgentConfig {
	id: string
	name?: string
	model?: string
	customProp?: string
	inputProcessors?: Processor[]
	outputProcessors?: Processor[]
	[key: string]: unknown
}

/**
 * Helper to create MastraMessageContentV2 from text
 */
function createMessageContent(text: string): MastraMessageContentV2 {
	return {
		format: 2,
		parts: [{ type: "text", text }],
	}
}

/**
 * Helper to create a MastraDBMessage
 */
function createMessage(
	role: "user" | "assistant" | "system",
	text: string,
): MastraDBMessage {
	return {
		id: `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		role,
		content: createMessageContent(text),
		createdAt: new Date(),
	}
}

const createMockMessageList = (): MessageList & {
	calls: { method: string; args: unknown[] }[]
} => {
	const calls: { method: string; args: unknown[] }[] = []
	return {
		calls,
		addSystem: vi.fn((content: string, _id?: string) => {
			calls.push({ method: "addSystem", args: [content, _id] })
		}),
		addUser: vi.fn((content: string) => {
			calls.push({ method: "addUser", args: [content] })
		}),
		addAssistant: vi.fn((content: string) => {
			calls.push({ method: "addAssistant", args: [content] })
		}),
	} as unknown as MessageList & { calls: { method: string; args: unknown[] }[] }
}

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

const createMockConversationResponse = () => ({
	id: "mem-123",
	conversationId: "conv-456",
	status: "created",
})

const createInputArgs = (
	overrides: Partial<ProcessInputArgs> = {},
): ProcessInputArgs =>
	({
		messages: [],
		systemMessages: [],
		messageList: createMockMessageList(),
		abort: vi.fn() as never,
		retryCount: 0,
		...overrides,
	}) as ProcessInputArgs

const createOutputArgs = (
	overrides: Partial<ProcessOutputResultArgs> = {},
): ProcessOutputResultArgs =>
	({
		messages: [],
		messageList: createMockMessageList(),
		abort: vi.fn() as never,
		retryCount: 0,
		...overrides,
	}) as ProcessOutputResultArgs

describe("SupermemoryInputProcessor", () => {
	let originalEnv: string | undefined
	let originalFetch: typeof globalThis.fetch
	let fetchMock: ReturnType<typeof vi.fn>

	beforeEach(() => {
		originalEnv = process.env.SUPERMEMORY_API_KEY
		process.env.SUPERMEMORY_API_KEY = TEST_CONFIG.apiKey
		originalFetch = globalThis.fetch
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

	describe("constructor", () => {
		it("should create processor with default options", () => {
			const processor = new SupermemoryInputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
			})
			expect(processor.id).toBe("supermemory-input")
			expect(processor.name).toBe("Supermemory Memory Injection")
		})

		it("should throw error if API key is not set", () => {
			delete process.env.SUPERMEMORY_API_KEY

			expect(() => {
				new SupermemoryInputProcessor({
					containerTag: TEST_CONFIG.containerTag,
					conversationId: TEST_CONFIG.conversationId,
				})
			}).toThrow("SUPERMEMORY_API_KEY is not set")
		})

		it("should accept API key via options", () => {
			delete process.env.SUPERMEMORY_API_KEY

			const processor = new SupermemoryInputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
				apiKey: "custom-key",
			})
			expect(processor.id).toBe("supermemory-input")
		})

		it("should throw error if conversationId is empty", () => {
			expect(() => {
				new SupermemoryInputProcessor({
					containerTag: TEST_CONFIG.containerTag,
					conversationId: "",
				})
			}).toThrow("[supermemory] conversationId is required")
		})

		it("should throw error if conversationId is whitespace", () => {
			expect(() => {
				new SupermemoryInputProcessor({
					containerTag: TEST_CONFIG.containerTag,
					conversationId: "   ",
				})
			}).toThrow("[supermemory] conversationId is required")
		})
	})

	describe("processInput", () => {
		it("should inject memories into messageList", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve(
						createMockProfileResponse(
							["User likes TypeScript"],
							["Recent interest in AI"],
						),
					),
			})

			const processor = new SupermemoryInputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
				apiKey: TEST_CONFIG.apiKey,
				mode: "profile",
			})

			const messageList = createMockMessageList()
			const args = createInputArgs({
				messages: [createMessage("user", "Hello")],
				messageList,
			})

			await processor.processInput(args)

			expect(messageList.addSystem).toHaveBeenCalled()
			const systemCall = messageList.calls.find((c) => c.method === "addSystem")
			expect(systemCall).toBeDefined()
			expect(systemCall?.args[0]).toContain("TypeScript")
			expect(systemCall?.args[1]).toBe("supermemory")
		})

		it("should use cached memories on second call with same message", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () =>
					Promise.resolve(createMockProfileResponse(["Cached memory"])),
			})

			const processor = new SupermemoryInputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
				apiKey: TEST_CONFIG.apiKey,
				mode: "profile",
			})

			const messages: MastraDBMessage[] = [createMessage("user", "Hello")]

			await processor.processInput(createInputArgs({ messages }))
			expect(fetchMock).toHaveBeenCalledTimes(1)

			await processor.processInput(createInputArgs({ messages }))
			expect(fetchMock).toHaveBeenCalledTimes(1)
		})

		it("should refetch memories for different user message", async () => {
			let callCount = 0
			fetchMock.mockImplementation(() => {
				callCount++
				return Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve(
							createMockProfileResponse([`Memory from call ${callCount}`]),
						),
				})
			})

			const processor = new SupermemoryInputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
				apiKey: TEST_CONFIG.apiKey,
				mode: "query",
			})

			await processor.processInput(
				createInputArgs({
					messages: [createMessage("user", "First message")],
				}),
			)
			expect(fetchMock).toHaveBeenCalledTimes(1)

			await processor.processInput(
				createInputArgs({
					messages: [createMessage("user", "Different message")],
				}),
			)
			expect(fetchMock).toHaveBeenCalledTimes(2)
		})

		it("should return messageList in query mode when no user message", async () => {
			const processor = new SupermemoryInputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
				apiKey: TEST_CONFIG.apiKey,
				mode: "query",
			})

			const messageList = createMockMessageList()
			const result = await processor.processInput(
				createInputArgs({ messages: [], messageList }),
			)

			expect(result).toBe(messageList)
			expect(fetchMock).not.toHaveBeenCalled()
			expect(messageList.addSystem).not.toHaveBeenCalled()
		})

		it("should handle API errors gracefully", async () => {
			fetchMock.mockResolvedValue({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				text: () => Promise.resolve("Server error"),
			})

			const processor = new SupermemoryInputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
				apiKey: TEST_CONFIG.apiKey,
				mode: "profile",
			})

			const messageList = createMockMessageList()
			const result = await processor.processInput(
				createInputArgs({
					messages: [createMessage("user", "Hello")],
					messageList,
				}),
			)

			expect(result).toBe(messageList)
			expect(messageList.addSystem).not.toHaveBeenCalled()
		})

		it("should use conversationId from requestContext fallback", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(createMockProfileResponse(["Memory"])),
			})

			const processor = new SupermemoryInputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
				apiKey: TEST_CONFIG.apiKey,
				mode: "profile",
			})

			const requestContext = new RequestContext()
			requestContext.set(MASTRA_THREAD_ID_KEY, "ctx-thread-456")

			await processor.processInput(
				createInputArgs({
					messages: [createMessage("user", "Hello")],
					requestContext,
				}),
			)

			expect(fetchMock).toHaveBeenCalled()
		})

		it("should handle messages with array content parts", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(createMockProfileResponse(["Memory"])),
			})

			const processor = new SupermemoryInputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
				apiKey: TEST_CONFIG.apiKey,
				mode: "query",
			})

			const messages: MastraDBMessage[] = [
				{
					id: "msg-1",
					role: "user",
					content: {
						format: 2,
						parts: [
							{ type: "text", text: "Hello " },
							{ type: "text", text: "World" },
						],
					},
					createdAt: new Date(),
				},
			]

			await processor.processInput(createInputArgs({ messages }))

			expect(fetchMock).toHaveBeenCalled()
		})
	})
})

describe("SupermemoryOutputProcessor", () => {
	let originalEnv: string | undefined
	let originalFetch: typeof globalThis.fetch
	let fetchMock: ReturnType<typeof vi.fn>

	beforeEach(() => {
		originalEnv = process.env.SUPERMEMORY_API_KEY
		process.env.SUPERMEMORY_API_KEY = TEST_CONFIG.apiKey
		originalFetch = globalThis.fetch
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

	describe("constructor", () => {
		it("should create processor with default options", () => {
			const processor = new SupermemoryOutputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
			})
			expect(processor.id).toBe("supermemory-output")
			expect(processor.name).toBe("Supermemory Conversation Save")
		})
	})

	describe("processOutputResult", () => {
		it("should save conversation when addMemory is always", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(createMockConversationResponse()),
			})

			const processor = new SupermemoryOutputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: "conv-456",
				apiKey: TEST_CONFIG.apiKey,
				addMemory: "always",
			})

			const args = createOutputArgs({
				messages: [
					createMessage("user", "Hello"),
					createMessage("assistant", "Hi there!"),
				],
			})

			await processor.processOutputResult(args)

			expect(fetchMock).toHaveBeenCalledTimes(1)
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/v4/conversations"),
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						"Content-Type": "application/json",
						Authorization: `Bearer ${TEST_CONFIG.apiKey}`,
					}),
				}),
			)

			const callBody = JSON.parse(
				(fetchMock.mock.calls[0]?.[1] as { body: string }).body,
			)
			expect(callBody.conversationId).toBe("conv-456")
			expect(callBody.messages).toHaveLength(2)
			expect(callBody.containerTags).toContain(TEST_CONFIG.containerTag)
		})

		it("should not save conversation when addMemory is never", async () => {
			const processor = new SupermemoryOutputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: "conv-456",
				apiKey: TEST_CONFIG.apiKey,
				addMemory: "never",
			})

			const args = createOutputArgs({
				messages: [
					createMessage("user", "Hello"),
					createMessage("assistant", "Hi!"),
				],
			})

			await processor.processOutputResult(args)

			expect(fetchMock).not.toHaveBeenCalled()
		})

		it("should use conversationId from requestContext", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(createMockConversationResponse()),
			})

			const processor = new SupermemoryOutputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
				apiKey: TEST_CONFIG.apiKey,
				addMemory: "always",
			})

			const requestContext = new RequestContext()
			requestContext.set(MASTRA_THREAD_ID_KEY, "ctx-thread-789")

			const args = createOutputArgs({
				messages: [
					createMessage("user", "Hello"),
					createMessage("assistant", "Hi!"),
				],
				requestContext,
			})

			await processor.processOutputResult(args)

			expect(fetchMock).toHaveBeenCalledTimes(1)
			const callBody = JSON.parse(
				(fetchMock.mock.calls[0]?.[1] as { body: string }).body,
			)
			// Should use the RequestContext override, not the default conversationId
			expect(callBody.conversationId).toBe("ctx-thread-789")
		})

		it("should skip system messages when saving", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(createMockConversationResponse()),
			})

			const processor = new SupermemoryOutputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: "conv-456",
				apiKey: TEST_CONFIG.apiKey,
				addMemory: "always",
			})

			const args = createOutputArgs({
				messages: [
					createMessage("system", "You are a helpful assistant"),
					createMessage("user", "Hello"),
					createMessage("assistant", "Hi there!"),
				],
			})

			await processor.processOutputResult(args)

			const callBody = JSON.parse(
				(fetchMock.mock.calls[0]?.[1] as { body: string }).body,
			)
			expect(callBody.messages).toHaveLength(2)
			expect(
				callBody.messages.every((m: { role: string }) => m.role !== "system"),
			).toBe(true)
		})

		it("should handle messages with array content parts", async () => {
			fetchMock.mockResolvedValue({
				ok: true,
				json: () => Promise.resolve(createMockConversationResponse()),
			})

			const processor = new SupermemoryOutputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: "conv-456",
				apiKey: TEST_CONFIG.apiKey,
				addMemory: "always",
			})

			const messages: MastraDBMessage[] = [
				{
					id: "msg-1",
					role: "user",
					content: {
						format: 2,
						parts: [
							{ type: "text", text: "Hello" },
							{ type: "text", text: " World" },
						],
					},
					createdAt: new Date(),
				},
				{
					id: "msg-2",
					role: "assistant",
					content: {
						format: 2,
						parts: [{ type: "text", text: "Hi!" }],
					},
					createdAt: new Date(),
				},
			]

			const args = createOutputArgs({ messages })

			await processor.processOutputResult(args)

			const callBody = JSON.parse(
				(fetchMock.mock.calls[0]?.[1] as { body: string }).body,
			)
			expect(callBody.messages).toHaveLength(2)
		})

		it("should handle save errors gracefully", async () => {
			fetchMock.mockResolvedValue({
				ok: false,
				status: 500,
				statusText: "Internal Server Error",
				text: () => Promise.resolve("Server error"),
			})

			const processor = new SupermemoryOutputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: "conv-456",
				apiKey: TEST_CONFIG.apiKey,
				addMemory: "always",
			})

			const args = createOutputArgs({
				messages: [
					createMessage("user", "Hello"),
					createMessage("assistant", "Hi!"),
				],
			})

			// Should not throw
			await expect(processor.processOutputResult(args)).resolves.toBeDefined()
		})

		it("should not save when no messages to save", async () => {
			const processor = new SupermemoryOutputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: "conv-456",
				apiKey: TEST_CONFIG.apiKey,
				addMemory: "always",
			})

			const args = createOutputArgs({ messages: [] })

			await processor.processOutputResult(args)

			expect(fetchMock).not.toHaveBeenCalled()
		})
	})
})

describe("Factory functions", () => {
	let originalEnv: string | undefined

	beforeEach(() => {
		originalEnv = process.env.SUPERMEMORY_API_KEY
		process.env.SUPERMEMORY_API_KEY = TEST_CONFIG.apiKey
	})

	afterEach(() => {
		if (originalEnv) {
			process.env.SUPERMEMORY_API_KEY = originalEnv
		} else {
			delete process.env.SUPERMEMORY_API_KEY
		}
	})

	describe("createSupermemoryProcessor", () => {
		it("should create input processor", () => {
			const processor = createSupermemoryProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
			})
			expect(processor).toBeInstanceOf(SupermemoryInputProcessor)
			expect(processor.id).toBe("supermemory-input")
		})

		it("should pass options to processor", () => {
			const processor = createSupermemoryProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
				apiKey: "custom-key",
				mode: "full",
			})
			expect(processor).toBeInstanceOf(SupermemoryInputProcessor)
		})
	})

	describe("createSupermemoryOutputProcessor", () => {
		it("should create output processor", () => {
			const processor = createSupermemoryOutputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
			})
			expect(processor).toBeInstanceOf(SupermemoryOutputProcessor)
			expect(processor.id).toBe("supermemory-output")
		})

		it("should pass options to processor", () => {
			const processor = createSupermemoryOutputProcessor({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
				apiKey: "custom-key",
				addMemory: "always",
			})
			expect(processor).toBeInstanceOf(SupermemoryOutputProcessor)
		})
	})

	describe("createSupermemoryProcessors", () => {
		it("should create both input and output processors", () => {
			const { input, output } = createSupermemoryProcessors({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
			})
			expect(input).toBeInstanceOf(SupermemoryInputProcessor)
			expect(output).toBeInstanceOf(SupermemoryOutputProcessor)
		})

		it("should share options between processors", () => {
			const { input, output } = createSupermemoryProcessors({
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
				apiKey: "custom-key",
				mode: "full",
				addMemory: "always",
			})
			expect(input.id).toBe("supermemory-input")
			expect(output.id).toBe("supermemory-output")
		})
	})
})

describe("withSupermemory", () => {
	let originalEnv: string | undefined

	beforeEach(() => {
		originalEnv = process.env.SUPERMEMORY_API_KEY
		process.env.SUPERMEMORY_API_KEY = TEST_CONFIG.apiKey
	})

	afterEach(() => {
		if (originalEnv) {
			process.env.SUPERMEMORY_API_KEY = originalEnv
		} else {
			delete process.env.SUPERMEMORY_API_KEY
		}
	})

	describe("API key validation", () => {
		it("should throw error if API key is not set", () => {
			delete process.env.SUPERMEMORY_API_KEY

			const config: MockAgentConfig = { id: "test-agent", name: "Test Agent" }

			expect(() => {
				withSupermemory(config, {
					containerTag: TEST_CONFIG.containerTag,
					conversationId: TEST_CONFIG.conversationId,
				})
			}).toThrow("SUPERMEMORY_API_KEY is not set")
		})

		it("should accept API key via options", () => {
			delete process.env.SUPERMEMORY_API_KEY

			const config: MockAgentConfig = { id: "test-agent", name: "Test Agent" }
			const enhanced = withSupermemory(config, {
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
				apiKey: "custom-key",
			})

			expect(enhanced).toBeDefined()
			expect(enhanced.inputProcessors).toHaveLength(1)
		})
	})

	describe("processor injection", () => {
		it("should inject input and output processors", () => {
			const config: MockAgentConfig = { id: "test-agent", name: "Test Agent" }
			const enhanced = withSupermemory(config, {
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
			})

			expect(enhanced.inputProcessors).toHaveLength(1)
			expect(enhanced.outputProcessors).toHaveLength(1)
			expect(enhanced.inputProcessors?.[0]?.id).toBe("supermemory-input")
			expect(enhanced.outputProcessors?.[0]?.id).toBe("supermemory-output")
		})

		it("should preserve original config properties", () => {
			const config: MockAgentConfig = {
				id: "test-agent",
				name: "Test Agent",
				model: "gpt-4",
				customProp: "value",
			}
			const enhanced = withSupermemory(config, {
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
			})

			expect(enhanced.id).toBe("test-agent")
			expect(enhanced.name).toBe("Test Agent")
			expect(enhanced.model).toBe("gpt-4")
			expect(enhanced.customProp).toBe("value")
		})

		it("should prepend input processor to existing processors", () => {
			const existingInputProcessor: Processor = {
				id: "existing-input",
				name: "Existing Input",
			}
			const config: MockAgentConfig = {
				id: "test-agent",
				name: "Test Agent",
				inputProcessors: [existingInputProcessor],
			}

			const enhanced = withSupermemory(config, {
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
			})

			expect(enhanced.inputProcessors).toHaveLength(2)
			expect(enhanced.inputProcessors?.[0]?.id).toBe("supermemory-input")
			expect(enhanced.inputProcessors?.[1]?.id).toBe("existing-input")
		})

		it("should append output processor to existing processors", () => {
			const existingOutputProcessor: Processor = {
				id: "existing-output",
				name: "Existing Output",
			}
			const config: MockAgentConfig = {
				id: "test-agent",
				name: "Test Agent",
				outputProcessors: [existingOutputProcessor],
			}

			const enhanced = withSupermemory(config, {
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
			})

			expect(enhanced.outputProcessors).toHaveLength(2)
			expect(enhanced.outputProcessors?.[0]?.id).toBe("existing-output")
			expect(enhanced.outputProcessors?.[1]?.id).toBe("supermemory-output")
		})

		it("should handle configs with both existing input and output processors", () => {
			const existingInput: Processor = { id: "existing-input" }
			const existingOutput: Processor = { id: "existing-output" }
			const config: MockAgentConfig = {
				id: "test-agent",
				name: "Test Agent",
				inputProcessors: [existingInput],
				outputProcessors: [existingOutput],
			}

			const enhanced = withSupermemory(config, {
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
			})

			expect(enhanced.inputProcessors).toHaveLength(2)
			expect(enhanced.outputProcessors).toHaveLength(2)
			expect(enhanced.inputProcessors?.[0]?.id).toBe("supermemory-input")
			expect(enhanced.inputProcessors?.[1]?.id).toBe("existing-input")
			expect(enhanced.outputProcessors?.[0]?.id).toBe("existing-output")
			expect(enhanced.outputProcessors?.[1]?.id).toBe("supermemory-output")
		})
	})

	describe("options passthrough", () => {
		it("should pass options to processors", () => {
			const config: MockAgentConfig = { id: "test-agent", name: "Test Agent" }
			const enhanced = withSupermemory(config, {
				containerTag: TEST_CONFIG.containerTag,
				conversationId: TEST_CONFIG.conversationId,
				mode: "full",
				addMemory: "always",
				verbose: true,
			})

			expect(enhanced.inputProcessors).toHaveLength(1)
			expect(enhanced.outputProcessors).toHaveLength(1)
		})
	})

	describe("conversationId validation", () => {
		it("should throw error if conversationId is empty", () => {
			const config: MockAgentConfig = { id: "test-agent", name: "Test Agent" }

			expect(() => {
				withSupermemory(config, {
					containerTag: TEST_CONFIG.containerTag,
					conversationId: "",
				})
			}).toThrow("[supermemory] conversationId is required")
		})

		it("should throw error if conversationId is whitespace", () => {
			const config: MockAgentConfig = { id: "test-agent", name: "Test Agent" }

			expect(() => {
				withSupermemory(config, {
					containerTag: TEST_CONFIG.containerTag,
					conversationId: "   ",
				})
			}).toThrow("[supermemory] conversationId is required")
		})
	})
})
