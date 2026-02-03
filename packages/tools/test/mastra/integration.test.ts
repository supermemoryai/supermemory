/**
 * Integration tests for the Mastra integration
 * Tests processors and wrapper with real Supermemory API calls
 */

import { describe, it, expect, vi } from "vitest"
import {
	RequestContext,
	MASTRA_THREAD_ID_KEY,
} from "@mastra/core/request-context"
import {
	SupermemoryInputProcessor,
	SupermemoryOutputProcessor,
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

interface MockAgentConfig {
	id: string
	name?: string
	model?: string
	inputProcessors?: Processor[]
	outputProcessors?: Processor[]
	[key: string]: unknown
}
import "dotenv/config"

const INTEGRATION_CONFIG = {
	apiKey: process.env.SUPERMEMORY_API_KEY || "",
	baseUrl: process.env.SUPERMEMORY_BASE_URL || "https://api.supermemory.ai",
	containerTag: "integration-test-mastra",
}

const shouldRunIntegration = !!process.env.SUPERMEMORY_API_KEY

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

/**
 * Creates a mock MessageList that captures calls for assertion.
 */
const createIntegrationMessageList = (): MessageList & {
	calls: { method: string; args: unknown[] }[]
	getSystemContent: () => string | undefined
} => {
	const calls: { method: string; args: unknown[] }[] = []
	return {
		calls,
		addSystem: vi.fn((content: string, id?: string) => {
			calls.push({ method: "addSystem", args: [content, id] })
		}),
		addUser: vi.fn((content: string) => {
			calls.push({ method: "addUser", args: [content] })
		}),
		addAssistant: vi.fn((content: string) => {
			calls.push({ method: "addAssistant", args: [content] })
		}),
		getSystemContent: () => {
			const systemCall = calls.find((c) => c.method === "addSystem")
			return systemCall?.args[0] as string | undefined
		},
	} as unknown as MessageList & {
		calls: { method: string; args: unknown[] }[]
		getSystemContent: () => string | undefined
	}
}

describe.skipIf(!shouldRunIntegration)(
	"Integration: Mastra processors with real API",
	() => {
		describe("SupermemoryInputProcessor", () => {
			it("should fetch real memories and inject into messageList", async () => {
				const processor = new SupermemoryInputProcessor(
					INTEGRATION_CONFIG.containerTag,
					{
						apiKey: INTEGRATION_CONFIG.apiKey,
						baseUrl: INTEGRATION_CONFIG.baseUrl,
						mode: "profile",
					},
				)

				const messageList = createIntegrationMessageList()
				const messages: MastraDBMessage[] = [
					createMessage("user", "Hello, what do you know about me?"),
				]

				const args: ProcessInputArgs = {
					messages,
					systemMessages: [],
					messageList,
					abort: vi.fn() as never,
					retryCount: 0,
				}

				await processor.processInput(args)

				expect(messageList.addSystem).toHaveBeenCalled()
				const systemContent = messageList.getSystemContent()
				expect(typeof systemContent).toBe("string")
			})

			it("should use query mode with user message as search query", async () => {
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const processor = new SupermemoryInputProcessor(
					INTEGRATION_CONFIG.containerTag,
					{
						apiKey: INTEGRATION_CONFIG.apiKey,
						baseUrl: INTEGRATION_CONFIG.baseUrl,
						mode: "query",
					},
				)

				const messageList = createIntegrationMessageList()
				const args: ProcessInputArgs = {
					messages: [
						createMessage(
							"user",
							"What are my favorite programming languages?",
						),
					],
					systemMessages: [],
					messageList,
					abort: vi.fn() as never,
					retryCount: 0,
				}

				await processor.processInput(args)

				const profileCalls = fetchSpy.mock.calls.filter(
					(call) =>
						typeof call[0] === "string" && call[0].includes("/v4/profile"),
				)
				expect(profileCalls.length).toBeGreaterThan(0)

				const profileCall = profileCalls[0]
				if (profileCall?.[1]) {
					const body = JSON.parse(
						(profileCall[1] as RequestInit).body as string,
					)
					expect(body.q).toBe("What are my favorite programming languages?")
				}

				fetchSpy.mockRestore()
			})

			it("should use full mode with both profile and query", async () => {
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const processor = new SupermemoryInputProcessor(
					INTEGRATION_CONFIG.containerTag,
					{
						apiKey: INTEGRATION_CONFIG.apiKey,
						baseUrl: INTEGRATION_CONFIG.baseUrl,
						mode: "full",
					},
				)

				const messageList = createIntegrationMessageList()
				const args: ProcessInputArgs = {
					messages: [createMessage("user", "Full mode test query")],
					systemMessages: [],
					messageList,
					abort: vi.fn() as never,
					retryCount: 0,
				}

				await processor.processInput(args)

				const profileCalls = fetchSpy.mock.calls.filter(
					(call) =>
						typeof call[0] === "string" && call[0].includes("/v4/profile"),
				)
				expect(profileCalls.length).toBeGreaterThan(0)

				const profileCall = profileCalls[0]
				if (profileCall?.[1]) {
					const body = JSON.parse(
						(profileCall[1] as RequestInit).body as string,
					)
					expect(body.q).toBe("Full mode test query")
				}

				fetchSpy.mockRestore()
			})

			it("should cache memories for repeated calls with same message", async () => {
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const processor = new SupermemoryInputProcessor(
					INTEGRATION_CONFIG.containerTag,
					{
						apiKey: INTEGRATION_CONFIG.apiKey,
						baseUrl: INTEGRATION_CONFIG.baseUrl,
						mode: "profile",
					},
				)

				const messages: MastraDBMessage[] = [
					createMessage("user", "Cache test message"),
				]

				const args1: ProcessInputArgs = {
					messages,
					systemMessages: [],
					messageList: createIntegrationMessageList(),
					abort: vi.fn() as never,
					retryCount: 0,
				}

				await processor.processInput(args1)
				const callsAfterFirst = fetchSpy.mock.calls.filter(
					(call) =>
						typeof call[0] === "string" && call[0].includes("/v4/profile"),
				).length

				const args2: ProcessInputArgs = {
					messages,
					systemMessages: [],
					messageList: createIntegrationMessageList(),
					abort: vi.fn() as never,
					retryCount: 0,
				}

				await processor.processInput(args2)
				const callsAfterSecond = fetchSpy.mock.calls.filter(
					(call) =>
						typeof call[0] === "string" && call[0].includes("/v4/profile"),
				).length

				expect(callsAfterSecond).toBe(callsAfterFirst)

				fetchSpy.mockRestore()
			})

			it("should use custom promptTemplate for memory formatting", async () => {
				const customTemplate = (data: {
					userMemories: string
					generalSearchMemories: string
				}) => `<mastra-memories>${data.userMemories}</mastra-memories>`

				const processor = new SupermemoryInputProcessor(
					INTEGRATION_CONFIG.containerTag,
					{
						apiKey: INTEGRATION_CONFIG.apiKey,
						baseUrl: INTEGRATION_CONFIG.baseUrl,
						mode: "profile",
						promptTemplate: customTemplate,
					},
				)

				const messageList = createIntegrationMessageList()
				const args: ProcessInputArgs = {
					messages: [createMessage("user", "Custom template test")],
					systemMessages: [],
					messageList,
					abort: vi.fn() as never,
					retryCount: 0,
				}

				await processor.processInput(args)

				const systemContent = messageList.getSystemContent()
				expect(systemContent).toMatch(/<mastra-memories>.*<\/mastra-memories>/s)
			})
		})

		describe("SupermemoryOutputProcessor", () => {
			it("should save conversation when addMemory is always", async () => {
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const threadId = `test-mastra-${Date.now()}`

				const processor = new SupermemoryOutputProcessor(
					INTEGRATION_CONFIG.containerTag,
					{
						apiKey: INTEGRATION_CONFIG.apiKey,
						baseUrl: INTEGRATION_CONFIG.baseUrl,
						addMemory: "always",
						threadId,
					},
				)

				const args: ProcessOutputResultArgs = {
					messages: [
						createMessage("user", "Hello from Mastra integration test"),
						createMessage("assistant", "Hi! I'm responding to the test."),
					],
					messageList: createIntegrationMessageList(),
					abort: vi.fn() as never,
					retryCount: 0,
				}

				await processor.processOutputResult(args)

				const conversationCalls = fetchSpy.mock.calls.filter(
					(call) =>
						typeof call[0] === "string" &&
						call[0].includes("/v4/conversations"),
				)
				expect(conversationCalls.length).toBeGreaterThan(0)

				fetchSpy.mockRestore()
			})

			it("should not save when addMemory is never", async () => {
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const processor = new SupermemoryOutputProcessor(
					INTEGRATION_CONFIG.containerTag,
					{
						apiKey: INTEGRATION_CONFIG.apiKey,
						baseUrl: INTEGRATION_CONFIG.baseUrl,
						addMemory: "never",
						threadId: "test-thread",
					},
				)

				const args: ProcessOutputResultArgs = {
					messages: [
						createMessage("user", "This should not be saved"),
						createMessage("assistant", "Agreed"),
					],
					messageList: createIntegrationMessageList(),
					abort: vi.fn() as never,
					retryCount: 0,
				}

				await processor.processOutputResult(args)

				const conversationCalls = fetchSpy.mock.calls.filter(
					(call) =>
						typeof call[0] === "string" &&
						call[0].includes("/v4/conversations"),
				)
				expect(conversationCalls.length).toBe(0)

				fetchSpy.mockRestore()
			})

			it("should use threadId from RequestContext when not in options", async () => {
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const processor = new SupermemoryOutputProcessor(
					INTEGRATION_CONFIG.containerTag,
					{
						apiKey: INTEGRATION_CONFIG.apiKey,
						baseUrl: INTEGRATION_CONFIG.baseUrl,
						addMemory: "always",
					},
				)

				const contextThreadId = `context-thread-${Date.now()}`
				const requestContext = new RequestContext()
				requestContext.set(MASTRA_THREAD_ID_KEY, contextThreadId)

				const args: ProcessOutputResultArgs = {
					messages: [
						createMessage("user", "Test with RequestContext threadId"),
						createMessage("assistant", "Got it!"),
					],
					messageList: createIntegrationMessageList(),
					abort: vi.fn() as never,
					retryCount: 0,
					requestContext,
				}

				await processor.processOutputResult(args)

				const conversationCalls = fetchSpy.mock.calls.filter(
					(call) =>
						typeof call[0] === "string" &&
						call[0].includes("/v4/conversations"),
				)
				expect(conversationCalls.length).toBeGreaterThan(0)

				fetchSpy.mockRestore()
			})
		})

		describe("createSupermemoryProcessors", () => {
			it("should create working input and output processors", async () => {
				const { input, output } = createSupermemoryProcessors(
					INTEGRATION_CONFIG.containerTag,
					{
						apiKey: INTEGRATION_CONFIG.apiKey,
						baseUrl: INTEGRATION_CONFIG.baseUrl,
						mode: "profile",
						addMemory: "always",
						threadId: `processors-test-${Date.now()}`,
					},
				)

				const messageList = createIntegrationMessageList()
				const inputArgs: ProcessInputArgs = {
					messages: [createMessage("user", "Test processors factory")],
					systemMessages: [],
					messageList,
					abort: vi.fn() as never,
					retryCount: 0,
				}

				await input.processInput(inputArgs)
				expect(messageList.addSystem).toHaveBeenCalled()

				const outputArgs: ProcessOutputResultArgs = {
					messages: [
						createMessage("user", "Test processors factory"),
						createMessage("assistant", "Response"),
					],
					messageList: createIntegrationMessageList(),
					abort: vi.fn() as never,
					retryCount: 0,
				}

				await output.processOutputResult(outputArgs)
			})
		})

		describe("withSupermemory wrapper", () => {
			it("should enhance config with working processors", async () => {
				const config: MockAgentConfig = {
					id: "test-mastra-agent",
					name: "Test Mastra Agent",
					model: "gpt-4o",
				}

				const enhanced = withSupermemory(
					config,
					INTEGRATION_CONFIG.containerTag,
					{
						apiKey: INTEGRATION_CONFIG.apiKey,
						baseUrl: INTEGRATION_CONFIG.baseUrl,
						mode: "profile",
						addMemory: "always",
						threadId: `wrapper-test-${Date.now()}`,
					},
				)

				expect(enhanced.id).toBe("test-mastra-agent")
				expect(enhanced.name).toBe("Test Mastra Agent")
				expect(enhanced.model).toBe("gpt-4o")
				expect(enhanced.inputProcessors).toHaveLength(1)
				expect(enhanced.outputProcessors).toHaveLength(1)

				const inputProcessor = enhanced.inputProcessors?.[0]
				expect(inputProcessor?.id).toBe("supermemory-input")

				if (inputProcessor?.processInput) {
					const messageList = createIntegrationMessageList()
					const args: ProcessInputArgs = {
						messages: [createMessage("user", "Wrapper test")],
						systemMessages: [],
						messageList,
						abort: vi.fn() as never,
						retryCount: 0,
					}

					await inputProcessor.processInput(args)
					expect(messageList.addSystem).toHaveBeenCalled()
				}
			})

			it("should merge with existing processors correctly", async () => {
				const existingInputProcessor = {
					id: "existing-input",
					name: "Existing Input Processor",
					processInput: vi.fn().mockResolvedValue(undefined),
				}

				const existingOutputProcessor = {
					id: "existing-output",
					name: "Existing Output Processor",
					processOutputResult: vi.fn().mockResolvedValue(undefined),
				}

				const config: MockAgentConfig = {
					id: "agent-with-processors",
					name: "Agent With Processors",
					inputProcessors: [existingInputProcessor],
					outputProcessors: [existingOutputProcessor],
				}

				const enhanced = withSupermemory(
					config,
					INTEGRATION_CONFIG.containerTag,
					{
						apiKey: INTEGRATION_CONFIG.apiKey,
						baseUrl: INTEGRATION_CONFIG.baseUrl,
						mode: "profile",
					},
				)

				expect(enhanced.inputProcessors).toHaveLength(2)
				expect(enhanced.outputProcessors).toHaveLength(2)

				expect(enhanced.inputProcessors?.[0]?.id).toBe("supermemory-input")
				expect(enhanced.inputProcessors?.[1]?.id).toBe("existing-input")

				expect(enhanced.outputProcessors?.[0]?.id).toBe("existing-output")
				expect(enhanced.outputProcessors?.[1]?.id).toBe("supermemory-output")
			})
		})

		describe("Options", () => {
			it("verbose mode should not break functionality", async () => {
				const processor = new SupermemoryInputProcessor(
					INTEGRATION_CONFIG.containerTag,
					{
						apiKey: INTEGRATION_CONFIG.apiKey,
						baseUrl: INTEGRATION_CONFIG.baseUrl,
						mode: "profile",
						verbose: true,
					},
				)

				const messageList = createIntegrationMessageList()
				const args: ProcessInputArgs = {
					messages: [createMessage("user", "Verbose mode test")],
					systemMessages: [],
					messageList,
					abort: vi.fn() as never,
					retryCount: 0,
				}

				await processor.processInput(args)

				expect(messageList.addSystem).toHaveBeenCalled()
			})

			it("custom baseUrl should be used for API calls", async () => {
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const processor = new SupermemoryInputProcessor(
					INTEGRATION_CONFIG.containerTag,
					{
						apiKey: INTEGRATION_CONFIG.apiKey,
						baseUrl: INTEGRATION_CONFIG.baseUrl,
						mode: "profile",
					},
				)

				const args: ProcessInputArgs = {
					messages: [createMessage("user", "Base URL test")],
					systemMessages: [],
					messageList: createIntegrationMessageList(),
					abort: vi.fn() as never,
					retryCount: 0,
				}

				await processor.processInput(args)

				const profileCalls = fetchSpy.mock.calls.filter(
					(call) =>
						typeof call[0] === "string" && call[0].includes("/v4/profile"),
				)
				expect(profileCalls.length).toBeGreaterThan(0)

				const url = profileCalls[0]?.[0] as string
				expect(url.startsWith(INTEGRATION_CONFIG.baseUrl)).toBe(true)

				fetchSpy.mockRestore()
			})
		})

		describe("Error handling", () => {
			it("should handle invalid API key gracefully", async () => {
				const processor = new SupermemoryInputProcessor(
					INTEGRATION_CONFIG.containerTag,
					{
						apiKey: "invalid-api-key-12345",
						baseUrl: INTEGRATION_CONFIG.baseUrl,
						mode: "profile",
					},
				)

				const messageList = createIntegrationMessageList()
				const args: ProcessInputArgs = {
					messages: [createMessage("user", "Invalid key test")],
					systemMessages: [],
					messageList,
					abort: vi.fn() as never,
					retryCount: 0,
				}

				const result = await processor.processInput(args)
				expect(result).toBe(messageList)
				expect(messageList.addSystem).not.toHaveBeenCalled()
			})

			it("output processor should handle save errors gracefully", async () => {
				const processor = new SupermemoryOutputProcessor(
					INTEGRATION_CONFIG.containerTag,
					{
						apiKey: "invalid-api-key-12345",
						baseUrl: INTEGRATION_CONFIG.baseUrl,
						addMemory: "always",
						threadId: "error-test",
					},
				)

				const args: ProcessOutputResultArgs = {
					messages: [
						createMessage("user", "Error test"),
						createMessage("assistant", "Response"),
					],
					messageList: createIntegrationMessageList(),
					abort: vi.fn() as never,
					retryCount: 0,
				}

				await expect(processor.processOutputResult(args)).resolves.toBeDefined()
			})
		})
	},
)
