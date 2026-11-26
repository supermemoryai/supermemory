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
	ProcessInputStepArgs,
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
	namespace: "integration-test-mastra",
	id: "integration-test-conversation",
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
		clearSystemMessages: vi.fn(),
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

type Prompt = Array<{
	role: string
	content: Array<{ type: string; text?: string }>
}>

// Runs one model call through the processor's wrapped model and returns the prompt the model got.
async function runStep(
	processor: { processInputStep?: (args: ProcessInputStepArgs) => unknown },
	text: string,
	history: Prompt = [],
): Promise<{ sent: Prompt; reply: { content: unknown[] } }> {
	const inner = {
		specificationVersion: "v2" as const,
		provider: "test-provider",
		modelId: "test-model",
		supportedUrls: {},
		doGenerate: vi.fn(async (_options: { prompt: Prompt }) => ({
			content: [{ type: "text", text: "ok" }],
			finishReason: "stop",
			usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
			warnings: [],
		})),
		doStream: vi.fn(),
	}
	const step = (await processor.processInputStep?.({
		model: inner,
		stepNumber: 0,
	} as unknown as ProcessInputStepArgs)) as {
		model: {
			doGenerate: (options: {
				prompt: Prompt
			}) => Promise<{ content: unknown[] }>
		}
	}
	const reply = await step.model.doGenerate({
		prompt: [...history, { role: "user", content: [{ type: "text", text }] }],
	})
	return { sent: inner.doGenerate.mock.calls[0]?.[0].prompt ?? [], reply }
}

describe.skipIf(!shouldRunIntegration)(
	"Integration: Mastra processors with real API",
	() => {
		describe("SupermemoryInputProcessor", () => {
			it("should send real memories after the user message and leave it untouched", async () => {
				const processor = new SupermemoryInputProcessor({
					namespace: INTEGRATION_CONFIG.namespace,
					id: INTEGRATION_CONFIG.id,
					apiKey: INTEGRATION_CONFIG.apiKey,
					baseUrl: INTEGRATION_CONFIG.baseUrl,
					mode: "profile",
				})

				const { sent } = await runStep(
					processor,
					"Hello, what do you know about me?",
				)

				expect(sent[0]).toEqual({
					role: "user",
					content: [
						{ type: "text", text: "Hello, what do you know about me?" },
					],
				})
				expect(sent.length).toBeLessThanOrEqual(2)
			})

			it("should use query mode with user message as search query", async () => {
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const processor = new SupermemoryInputProcessor({
					namespace: INTEGRATION_CONFIG.namespace,
					id: INTEGRATION_CONFIG.id,
					apiKey: INTEGRATION_CONFIG.apiKey,
					baseUrl: INTEGRATION_CONFIG.baseUrl,
					mode: "query",
				})

				await runStep(processor, "What are my favorite programming languages?")

				const searchCalls = fetchSpy.mock.calls.filter((call) =>
					String(call[0] instanceof Request ? call[0].url : call[0]).includes(
						"/search",
					),
				)
				expect(searchCalls.length).toBeGreaterThan(0)

				fetchSpy.mockRestore()
			})

			it("should use full mode with both profile and query", async () => {
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const processor = new SupermemoryInputProcessor({
					namespace: INTEGRATION_CONFIG.namespace,
					id: INTEGRATION_CONFIG.id,
					apiKey: INTEGRATION_CONFIG.apiKey,
					baseUrl: INTEGRATION_CONFIG.baseUrl,
					mode: "full",
				})

				await runStep(processor, "Full mode test query")

				const paths = fetchSpy.mock.calls.map((call) =>
					String(call[0] instanceof Request ? call[0].url : call[0]),
				)
				expect(paths.some((path) => path.includes("/search"))).toBe(true)
				expect(paths.some((path) => path.includes("/profile"))).toBe(true)

				fetchSpy.mockRestore()
			})

			it("should restore a signed block from the stored reply instead of recalling again", async () => {
				const processor = new SupermemoryInputProcessor({
					namespace: INTEGRATION_CONFIG.namespace,
					id: INTEGRATION_CONFIG.id,
					apiKey: INTEGRATION_CONFIG.apiKey,
					baseUrl: INTEGRATION_CONFIG.baseUrl,
					mode: "profile",
					promptTemplate: () => "<mastra-memories>always</mastra-memories>",
				})
				const first = await runStep(processor, "Restore test")
				const replyPart = first.reply.content[0] as {
					providerMetadata?: Record<string, unknown>
				}

				const second = await runStep(processor, "Next", [
					...first.sent.slice(0, 1),
					{
						role: "assistant",
						content: [
							{
								type: "text",
								text: "ok",
								providerOptions: replyPart.providerMetadata,
							} as never,
						],
					},
				])

				expect(second.sent.slice(0, first.sent.length)).toEqual(first.sent)
			})

			it("should use custom promptTemplate for memory formatting", async () => {
				const customTemplate = (data: {
					userMemories: string
					generalSearchMemories: string
				}) => `<mastra-memories>${data.userMemories}</mastra-memories>`

				const processor = new SupermemoryInputProcessor({
					namespace: INTEGRATION_CONFIG.namespace,
					id: INTEGRATION_CONFIG.id,
					apiKey: INTEGRATION_CONFIG.apiKey,
					baseUrl: INTEGRATION_CONFIG.baseUrl,
					mode: "profile",
					promptTemplate: customTemplate,
				})

				const { sent } = await runStep(processor, "Custom template test")

				expect(JSON.stringify(sent.at(-1))).toMatch(
					/<mastra-memories>.*<\/mastra-memories>/s,
				)
			})
		})

		describe("SupermemoryOutputProcessor", () => {
			it("should save conversation when addMemory is always", async () => {
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const id = `test-mastra-${Date.now()}`

				const processor = new SupermemoryOutputProcessor({
					namespace: INTEGRATION_CONFIG.namespace,
					id,
					apiKey: INTEGRATION_CONFIG.apiKey,
					baseUrl: INTEGRATION_CONFIG.baseUrl,
					addMemory: "always",
				})

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
						typeof call[0] === "string" && call[0].includes("/document"),
				)
				expect(conversationCalls.length).toBeGreaterThan(0)

				fetchSpy.mockRestore()
			})

			it("should not save when addMemory is never", async () => {
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const processor = new SupermemoryOutputProcessor({
					namespace: INTEGRATION_CONFIG.namespace,
					id: "test-thread",
					apiKey: INTEGRATION_CONFIG.apiKey,
					baseUrl: INTEGRATION_CONFIG.baseUrl,
					addMemory: "never",
				})

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
						typeof call[0] === "string" && call[0].includes("/document"),
				)
				expect(conversationCalls.length).toBe(0)

				fetchSpy.mockRestore()
			})

			it("should use threadId from RequestContext when available", async () => {
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const processor = new SupermemoryOutputProcessor({
					namespace: INTEGRATION_CONFIG.namespace,
					id: INTEGRATION_CONFIG.id,
					apiKey: INTEGRATION_CONFIG.apiKey,
					baseUrl: INTEGRATION_CONFIG.baseUrl,
					addMemory: "always",
				})

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
						typeof call[0] === "string" && call[0].includes("/document"),
				)
				expect(conversationCalls.length).toBeGreaterThan(0)

				fetchSpy.mockRestore()
			})
		})

		describe("createSupermemoryProcessors", () => {
			it("should create working input and output processors", async () => {
				const { input, output } = createSupermemoryProcessors({
					namespace: INTEGRATION_CONFIG.namespace,
					id: `processors-test-${Date.now()}`,
					apiKey: INTEGRATION_CONFIG.apiKey,
					baseUrl: INTEGRATION_CONFIG.baseUrl,
					mode: "profile",
					addMemory: "always",
				})

				const { sent } = await runStep(input, "Test processors factory")
				expect(sent[0]?.role).toBe("user")

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

				const enhanced = withSupermemory(config, {
					namespace: INTEGRATION_CONFIG.namespace,
					id: `wrapper-test-${Date.now()}`,
					apiKey: INTEGRATION_CONFIG.apiKey,
					baseUrl: INTEGRATION_CONFIG.baseUrl,
					mode: "profile",
					addMemory: "always",
				})

				expect(enhanced.id).toBe("test-mastra-agent")
				expect(enhanced.name).toBe("Test Mastra Agent")
				expect(enhanced.model).toBe("gpt-4o")
				expect(enhanced.inputProcessors).toHaveLength(1)
				expect(enhanced.outputProcessors).toHaveLength(1)

				const inputProcessor = enhanced.inputProcessors?.[0]
				expect(inputProcessor?.id).toBe("supermemory-input")

				if (inputProcessor?.processInputStep) {
					const { sent } = await runStep(inputProcessor, "Wrapper test")
					expect(sent[0]?.role).toBe("user")
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

				const enhanced = withSupermemory(config, {
					namespace: INTEGRATION_CONFIG.namespace,
					id: INTEGRATION_CONFIG.id,
					apiKey: INTEGRATION_CONFIG.apiKey,
					baseUrl: INTEGRATION_CONFIG.baseUrl,
					mode: "profile",
				})

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
				const processor = new SupermemoryInputProcessor({
					namespace: INTEGRATION_CONFIG.namespace,
					id: INTEGRATION_CONFIG.id,
					apiKey: INTEGRATION_CONFIG.apiKey,
					baseUrl: INTEGRATION_CONFIG.baseUrl,
					mode: "profile",
					verbose: true,
				})

				const { sent } = await runStep(processor, "Verbose mode test")

				expect(sent[0]?.role).toBe("user")
			})

			it("custom baseUrl should be used for API calls", async () => {
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const processor = new SupermemoryInputProcessor({
					namespace: INTEGRATION_CONFIG.namespace,
					id: INTEGRATION_CONFIG.id,
					apiKey: INTEGRATION_CONFIG.apiKey,
					baseUrl: INTEGRATION_CONFIG.baseUrl,
					mode: "profile",
				})

				await runStep(processor, "Base URL test")

				const profileCalls = fetchSpy.mock.calls
					.map((call) =>
						String(call[0] instanceof Request ? call[0].url : call[0]),
					)
					.filter((url) => url.includes("/profile"))
				expect(profileCalls.length).toBeGreaterThan(0)

				const url = profileCalls[0] as string
				expect(url.startsWith(INTEGRATION_CONFIG.baseUrl)).toBe(true)

				fetchSpy.mockRestore()
			})
		})

		describe("Error handling", () => {
			it("should handle invalid API key gracefully", async () => {
				const processor = new SupermemoryInputProcessor({
					namespace: INTEGRATION_CONFIG.namespace,
					id: INTEGRATION_CONFIG.id,
					apiKey: "invalid-api-key-12345",
					baseUrl: INTEGRATION_CONFIG.baseUrl,
					mode: "profile",
				})

				const { sent } = await runStep(processor, "Invalid key test")
				expect(sent).toEqual([
					{
						role: "user",
						content: [{ type: "text", text: "Invalid key test" }],
					},
				])
			})

			it("output processor should handle save errors gracefully", async () => {
				const processor = new SupermemoryOutputProcessor({
					namespace: INTEGRATION_CONFIG.namespace,
					id: "error-test",
					apiKey: "invalid-api-key-12345",
					baseUrl: INTEGRATION_CONFIG.baseUrl,
					addMemory: "always",
				})

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
