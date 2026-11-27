/**
 * Unit tests for the Mastra integration
 * Tests processors, wrapper, and factory functions
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import {
	addBody,
	errorResponse,
	jsonResponse,
	profileBody,
	requestJson,
	requestPath,
} from "../v5-fetch"
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
	ProcessInputStepArgs,
	ProcessOutputResultArgs,
	MessageList,
	MastraDBMessage,
	MastraMessageContentV2,
	Processor,
} from "../../src/mastra"

const TEST_CONFIG = {
	apiKey: "test-api-key",
	baseUrl: "https://api.supermemory.ai",
	namespace: "test-mastra-user",
	id: "test-conversation",
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
		clearSystemMessages: vi.fn(),
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

const createMockProfileResponse = profileBody
const createMockConversationResponse = () => addBody("mem-123")

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
		it("should create processor with required options", () => {
			const processor = new SupermemoryInputProcessor({
				namespace: TEST_CONFIG.namespace,
				id: TEST_CONFIG.id,
			})
			expect(processor.id).toBe("supermemory-input")
			expect(processor.name).toBe("Supermemory Memory Injection")
		})

		it("should throw error if API key is not set", () => {
			delete process.env.SUPERMEMORY_API_KEY

			expect(() => {
				new SupermemoryInputProcessor({
					namespace: TEST_CONFIG.namespace,
					id: TEST_CONFIG.id,
				})
			}).toThrow("SUPERMEMORY_API_KEY is not set")
		})

		it("should accept API key via options", () => {
			delete process.env.SUPERMEMORY_API_KEY

			const processor = new SupermemoryInputProcessor({
				namespace: TEST_CONFIG.namespace,
				id: TEST_CONFIG.id,
				apiKey: "custom-key",
			})
			expect(processor.id).toBe("supermemory-input")
		})
	})

	describe("processInputStep", () => {
		const createModel = () => ({
			specificationVersion: "v2" as const,
			provider: "test-provider",
			modelId: "test-model",
			supportedUrls: {},
			doGenerate: vi.fn(async (_options: unknown) => ({
				content: [{ type: "text", text: "Hi" }],
				finishReason: "stop",
				usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
				warnings: [],
			})),
			doStream: vi.fn(),
		})

		const stepArgs = (model: unknown) =>
			({ model, stepNumber: 0 }) as unknown as ProcessInputStepArgs

		const createProcessor = () =>
			new SupermemoryInputProcessor({
				namespace: TEST_CONFIG.namespace,
				id: TEST_CONFIG.id,
				apiKey: TEST_CONFIG.apiKey,
				mode: "profile",
			})

		const userPrompt = [
			{
				role: "user" as const,
				content: [{ type: "text" as const, text: "Hello" }],
			},
		]

		it("wraps the model so the call gets a trailing memory message and a tagged reply", async () => {
			fetchMock.mockImplementation(async () =>
				jsonResponse(
					createMockProfileResponse(
						["User likes TypeScript"],
						["Recent interest in AI"],
					),
				),
			)
			const inner = createModel()

			const { model } = createProcessor().processInputStep(stepArgs(inner)) as {
				model: ReturnType<typeof createModel>
			}
			const result = (await model.doGenerate({
				prompt: userPrompt,
			} as never)) as {
				content: Array<{ providerMetadata?: Record<string, unknown> }>
			}

			const sent = (inner.doGenerate.mock.calls[0] as unknown[])[0] as {
				prompt: Array<{ role: string; content: Array<{ text: string }> }>
			}
			expect(sent.prompt[0]).toEqual(userPrompt[0])
			expect(sent.prompt[1]?.role).toBe("user")
			expect(sent.prompt[1]?.content[0]?.text).toContain("TypeScript")
			expect(sent.prompt[1]?.content[0]?.text).toContain(
				'<supermemory context="user-memories" readonly>',
			)
			expect(result.content[0]?.providerMetadata?.supermemory).toMatchObject({
				block: sent.prompt[1]?.content[0]?.text,
			})
		})

		it("does not wrap a model twice across steps", () => {
			const processor = createProcessor()
			const { model } = processor.processInputStep(stepArgs(createModel()))
			expect(processor.processInputStep(stepArgs(model)).model).toBe(model)
		})

		it("leaves an unresolved model alone", () => {
			expect(
				createProcessor().processInputStep(stepArgs("openai/gpt-4o")),
			).toEqual({})
		})

		it("calls the model without memories when recall fails", async () => {
			fetchMock.mockImplementation(async () => errorResponse(500))
			const inner = createModel()

			const { model } = createProcessor().processInputStep(stepArgs(inner)) as {
				model: ReturnType<typeof createModel>
			}
			await model.doGenerate({ prompt: userPrompt } as never)

			expect(inner.doGenerate).toHaveBeenCalledWith({ prompt: userPrompt })
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
		it("should create processor with required options", () => {
			const processor = new SupermemoryOutputProcessor({
				namespace: TEST_CONFIG.namespace,
				id: TEST_CONFIG.id,
			})
			expect(processor.id).toBe("supermemory-output")
			expect(processor.name).toBe("Supermemory Conversation Save")
		})
	})

	describe("processOutputResult", () => {
		it("should save conversation when addMemory is always", async () => {
			fetchMock.mockImplementation(async () =>
				jsonResponse(createMockConversationResponse()),
			)

			const processor = new SupermemoryOutputProcessor({
				namespace: TEST_CONFIG.namespace,
				id: "conv-456",
				apiKey: TEST_CONFIG.apiKey,
				addMemory: "always",
			})

			const messages: MastraDBMessage[] = [
				createMessage("user", "Hello"),
				createMessage("assistant", "Hi there!"),
			]

			const args: ProcessOutputResultArgs = {
				messages,
				messageList: createMockMessageList(),
				abort: vi.fn() as never,
				retryCount: 0,
			}

			await processor.processOutputResult(args)

			expect(fetchMock).toHaveBeenCalledTimes(1)
			const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
			expect(requestPath(url)).toBe(`/ns/${TEST_CONFIG.namespace}/document`)
			expect(init.method).toBe("POST")
			expect(new Headers(init.headers).get("authorization")).toBe(
				`Bearer ${TEST_CONFIG.apiKey}`,
			)

			const callBody = requestJson(fetchMock.mock.calls[0]?.[1])
			expect(callBody.id).toBe("conv-456")
			expect(String(callBody.content).split("\n\n")).toHaveLength(2)
			expect(callBody.dreaming).toBe("instant")
		})

		it("should not save conversation when addMemory is never", async () => {
			const processor = new SupermemoryOutputProcessor({
				namespace: TEST_CONFIG.namespace,
				id: "conv-456",
				apiKey: TEST_CONFIG.apiKey,
				addMemory: "never",
			})

			const args: ProcessOutputResultArgs = {
				messages: [
					createMessage("user", "Hello"),
					createMessage("assistant", "Hi!"),
				],
				messageList: createMockMessageList(),
				abort: vi.fn() as never,
				retryCount: 0,
			}

			await processor.processOutputResult(args)

			expect(fetchMock).not.toHaveBeenCalled()
		})

		it("should use id from options for conversation save", async () => {
			fetchMock.mockImplementation(async () =>
				jsonResponse(createMockConversationResponse()),
			)

			const processor = new SupermemoryOutputProcessor({
				namespace: TEST_CONFIG.namespace,
				id: "my-custom-id",
				apiKey: TEST_CONFIG.apiKey,
				addMemory: "always",
			})

			const args: ProcessOutputResultArgs = {
				messages: [
					createMessage("user", "Hello"),
					createMessage("assistant", "Hi!"),
				],
				messageList: createMockMessageList(),
				abort: vi.fn() as never,
				retryCount: 0,
			}

			await processor.processOutputResult(args)

			expect(fetchMock).toHaveBeenCalledTimes(1)
			const callBody = requestJson(fetchMock.mock.calls[0]?.[1])
			expect(callBody.id).toBe("my-custom-id")
		})

		it("should use threadId from requestContext (takes precedence over id)", async () => {
			fetchMock.mockImplementation(async () =>
				jsonResponse(createMockConversationResponse()),
			)

			const processor = new SupermemoryOutputProcessor({
				namespace: TEST_CONFIG.namespace,
				id: "fallback-custom-id",
				apiKey: TEST_CONFIG.apiKey,
				addMemory: "always",
			})

			const requestContext = new RequestContext()
			requestContext.set(MASTRA_THREAD_ID_KEY, "ctx-thread-789")

			const args: ProcessOutputResultArgs = {
				messages: [
					createMessage("user", "Hello"),
					createMessage("assistant", "Hi!"),
				],
				messageList: createMockMessageList(),
				abort: vi.fn() as never,
				retryCount: 0,
				requestContext,
			}

			await processor.processOutputResult(args)

			expect(fetchMock).toHaveBeenCalledTimes(1)
			const callBody = requestJson(fetchMock.mock.calls[0]?.[1])
			// RequestContext threadId takes precedence for per-request dynamic IDs
			expect(callBody.id).toBe("ctx-thread-789")
		})

		it("should fall back to id when requestContext has no threadId", async () => {
			fetchMock.mockImplementation(async () =>
				jsonResponse(createMockConversationResponse()),
			)

			const processor = new SupermemoryOutputProcessor({
				namespace: TEST_CONFIG.namespace,
				id: "fallback-custom-id",
				apiKey: TEST_CONFIG.apiKey,
				addMemory: "always",
			})

			const args: ProcessOutputResultArgs = {
				messages: [
					createMessage("user", "Hello"),
					createMessage("assistant", "Hi!"),
				],
				messageList: createMockMessageList(),
				abort: vi.fn() as never,
				retryCount: 0,
			}

			await processor.processOutputResult(args)

			expect(fetchMock).toHaveBeenCalledTimes(1)
			const callBody = requestJson(fetchMock.mock.calls[0]?.[1])
			// Falls back to id when no RequestContext threadId
			expect(callBody.id).toBe("fallback-custom-id")
		})

		it("should skip system messages when saving", async () => {
			fetchMock.mockImplementation(async () =>
				jsonResponse(createMockConversationResponse()),
			)

			const processor = new SupermemoryOutputProcessor({
				namespace: TEST_CONFIG.namespace,
				id: "conv-456",
				apiKey: TEST_CONFIG.apiKey,
				addMemory: "always",
			})

			const messages: MastraDBMessage[] = [
				createMessage("system", "You are a helpful assistant"),
				createMessage("user", "Hello"),
				createMessage("assistant", "Hi there!"),
			]

			const args: ProcessOutputResultArgs = {
				messages,
				messageList: createMockMessageList(),
				abort: vi.fn() as never,
				retryCount: 0,
			}

			await processor.processOutputResult(args)

			const callBody = requestJson(fetchMock.mock.calls[0]?.[1])
			expect(String(callBody.content).split("\n\n")).toHaveLength(2)
			expect(callBody.content).not.toContain("System:")
		})

		it("should handle messages with array content parts", async () => {
			fetchMock.mockImplementation(async () =>
				jsonResponse(createMockConversationResponse()),
			)

			const processor = new SupermemoryOutputProcessor({
				namespace: TEST_CONFIG.namespace,
				id: "conv-456",
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

			const args: ProcessOutputResultArgs = {
				messages,
				messageList: createMockMessageList(),
				abort: vi.fn() as never,
				retryCount: 0,
			}

			await processor.processOutputResult(args)

			const callBody = requestJson(fetchMock.mock.calls[0]?.[1])
			expect(String(callBody.content).split("\n\n")).toHaveLength(2)
		})

		it("should handle save errors gracefully", async () => {
			fetchMock.mockImplementation(async () => errorResponse(500))

			const processor = new SupermemoryOutputProcessor({
				namespace: TEST_CONFIG.namespace,
				id: "conv-456",
				apiKey: TEST_CONFIG.apiKey,
				addMemory: "always",
			})

			const args: ProcessOutputResultArgs = {
				messages: [
					createMessage("user", "Hello"),
					createMessage("assistant", "Hi!"),
				],
				messageList: createMockMessageList(),
				abort: vi.fn() as never,
				retryCount: 0,
			}

			// Should not throw
			await expect(processor.processOutputResult(args)).resolves.toBeDefined()
		})

		it("should not save when no messages to save", async () => {
			const processor = new SupermemoryOutputProcessor({
				namespace: TEST_CONFIG.namespace,
				id: "conv-456",
				apiKey: TEST_CONFIG.apiKey,
				addMemory: "always",
			})

			const args: ProcessOutputResultArgs = {
				messages: [],
				messageList: createMockMessageList(),
				abort: vi.fn() as never,
				retryCount: 0,
			}

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
				namespace: TEST_CONFIG.namespace,
				id: TEST_CONFIG.id,
			})
			expect(processor).toBeInstanceOf(SupermemoryInputProcessor)
			expect(processor.id).toBe("supermemory-input")
		})

		it("should pass options to processor", () => {
			const processor = createSupermemoryProcessor({
				namespace: TEST_CONFIG.namespace,
				id: TEST_CONFIG.id,
				apiKey: "custom-key",
				mode: "full",
			})
			expect(processor).toBeInstanceOf(SupermemoryInputProcessor)
		})
	})

	describe("createSupermemoryOutputProcessor", () => {
		it("should create output processor", () => {
			const processor = createSupermemoryOutputProcessor({
				namespace: TEST_CONFIG.namespace,
				id: TEST_CONFIG.id,
			})
			expect(processor).toBeInstanceOf(SupermemoryOutputProcessor)
			expect(processor.id).toBe("supermemory-output")
		})

		it("should pass options to processor", () => {
			const processor = createSupermemoryOutputProcessor({
				namespace: TEST_CONFIG.namespace,
				id: "conv-123",
				apiKey: "custom-key",
				addMemory: "always",
			})
			expect(processor).toBeInstanceOf(SupermemoryOutputProcessor)
		})
	})

	describe("createSupermemoryProcessors", () => {
		it("should create both input and output processors", () => {
			const { input, output } = createSupermemoryProcessors({
				namespace: TEST_CONFIG.namespace,
				id: TEST_CONFIG.id,
			})
			expect(input).toBeInstanceOf(SupermemoryInputProcessor)
			expect(output).toBeInstanceOf(SupermemoryOutputProcessor)
		})

		it("should share options between processors", () => {
			const { input, output } = createSupermemoryProcessors({
				namespace: TEST_CONFIG.namespace,
				id: "conv-123",
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
					namespace: TEST_CONFIG.namespace,
					id: TEST_CONFIG.id,
				})
			}).toThrow("SUPERMEMORY_API_KEY is not set")
		})

		it("should accept API key via options", () => {
			delete process.env.SUPERMEMORY_API_KEY

			const config: MockAgentConfig = { id: "test-agent", name: "Test Agent" }
			const enhanced = withSupermemory(config, {
				namespace: TEST_CONFIG.namespace,
				id: TEST_CONFIG.id,
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
				namespace: TEST_CONFIG.namespace,
				id: TEST_CONFIG.id,
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
				namespace: TEST_CONFIG.namespace,
				id: TEST_CONFIG.id,
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
				namespace: TEST_CONFIG.namespace,
				id: TEST_CONFIG.id,
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
				namespace: TEST_CONFIG.namespace,
				id: TEST_CONFIG.id,
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
				namespace: TEST_CONFIG.namespace,
				id: TEST_CONFIG.id,
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
				namespace: TEST_CONFIG.namespace,
				id: "conv-123",
				mode: "full",
				addMemory: "always",
				verbose: true,
			})

			expect(enhanced.inputProcessors).toHaveLength(1)
			expect(enhanced.outputProcessors).toHaveLength(1)
		})
	})
})
