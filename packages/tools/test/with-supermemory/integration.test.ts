/**
 * Integration tests for the withSupermemory wrapper
 */

import { describe, it, expect, vi } from "vitest"
import { withSupermemory } from "../../src/vercel"
import type {
	LanguageModelV2,
	LanguageModelV2CallOptions,
} from "@ai-sdk/provider"
import "dotenv/config"

const INTEGRATION_CONFIG = {
	apiKey: process.env.SUPERMEMORY_API_KEY || "",
	baseUrl: process.env.SUPERMEMORY_BASE_URL || "https://api.supermemory.ai",
	containerTag: "integration-test-vercel-wrapper",
}

const shouldRunIntegration = !!process.env.SUPERMEMORY_API_KEY

/**
 * Creates a mock language model that captures params for assertion
 * while simulating realistic LLM behavior.
 */
const createIntegrationMockModel = () => {
	let capturedGenerateParams: LanguageModelV2CallOptions | null = null
	let capturedStreamParams: LanguageModelV2CallOptions | null = null

	const model: LanguageModelV2 = {
		specificationVersion: "v2",
		provider: "integration-test",
		modelId: "mock-model",
		supportedUrls: {},
		doGenerate: vi.fn(async (params: LanguageModelV2CallOptions) => {
			capturedGenerateParams = params
			return {
				content: [{ type: "text" as const, text: "Mock response from LLM" }],
				finishReason: "stop" as const,
				usage: {
					promptTokens: 10,
					completionTokens: 5,
					inputTokens: 10,
					outputTokens: 5,
					totalTokens: 15,
				},
				rawCall: { rawPrompt: params.prompt, rawSettings: {} },
				warnings: [],
			}
		}),
		doStream: vi.fn(async (params: LanguageModelV2CallOptions) => {
			capturedStreamParams = params
			const chunks = ["Mock ", "streamed ", "response"]
			return {
				stream: new ReadableStream({
					async start(controller) {
						for (const chunk of chunks) {
							controller.enqueue({ type: "text-delta", delta: chunk })
						}
						controller.enqueue({
							type: "finish",
							finishReason: "stop",
							usage: {
								promptTokens: 10,
								completionTokens: 5,
								inputTokens: 10,
								outputTokens: 5,
								totalTokens: 15,
							},
						})
						controller.close()
					},
				}),
				rawCall: { rawPrompt: params.prompt, rawSettings: {} },
			}
		}),
	}

	return {
		model,
		getCapturedGenerateParams: () => capturedGenerateParams,
		getCapturedStreamParams: () => capturedStreamParams,
		reset: () => {
			capturedGenerateParams = null
			capturedStreamParams = null
			vi.mocked(model.doGenerate).mockClear()
			vi.mocked(model.doStream).mockClear()
		},
	}
}

describe.skipIf(!shouldRunIntegration)(
	"Integration: withSupermemory wrapper with real API",
	() => {
		describe("doGenerate flow", () => {
			it("should fetch real memories and inject into params passed to model", async () => {
				const { model, getCapturedGenerateParams } =
					createIntegrationMockModel()

				const wrapped = withSupermemory(model, INTEGRATION_CONFIG.containerTag, {
					apiKey: INTEGRATION_CONFIG.apiKey,
					mode: "profile",
				})

				await wrapped.doGenerate({
					prompt: [
						{
							role: "user",
							content: [{ type: "text", text: "Hello, what do you know?" }],
						},
					],
				})

				const capturedParams = getCapturedGenerateParams()
				expect(capturedParams).not.toBeNull()
				expect(capturedParams?.prompt[0]?.role).toBe("system")
				// Memory content injected (may be empty if no memories exist)
				expect(typeof capturedParams?.prompt[0]?.content).toBe("string")
			})

			it("should save memory when addMemory is always", async () => {
				const { model } = createIntegrationMockModel()
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const conversationId = `test-generate-${Date.now()}`

				const wrapped = withSupermemory(model, INTEGRATION_CONFIG.containerTag, {
					apiKey: INTEGRATION_CONFIG.apiKey,
					mode: "profile",
					addMemory: "always",
					conversationId,
				})

				await wrapped.doGenerate({
					prompt: [
						{
							role: "user",
							content: [
								{ type: "text", text: "Remember that I love integration tests" },
							],
						},
					],
				})

				// Wait for background save to complete
				await new Promise((resolve) => setTimeout(resolve, 2000))

				// Verify /v4/conversations was called for saving
				const conversationCalls = fetchSpy.mock.calls.filter(
					(call) =>
						typeof call[0] === "string" &&
						call[0].includes("/v4/conversations"),
				)
				expect(conversationCalls.length).toBeGreaterThan(0)

				fetchSpy.mockRestore()
			})

			it("should work with conversationId for grouped memories", async () => {
				const { model, getCapturedGenerateParams } =
					createIntegrationMockModel()

				const conversationId = `test-conversation-${Date.now()}`

				const wrapped = withSupermemory(model, INTEGRATION_CONFIG.containerTag, {
					apiKey: INTEGRATION_CONFIG.apiKey,
					mode: "profile",
					conversationId,
				})

				await wrapped.doGenerate({
					prompt: [
						{
							role: "user",
							content: [{ type: "text", text: "First message in conversation" }],
						},
					],
				})

				const capturedParams = getCapturedGenerateParams()
				expect(capturedParams).not.toBeNull()
				expect(model.doGenerate).toHaveBeenCalledTimes(1)
			})
		})

		describe("doStream flow", () => {
			it("should fetch memories and stream response", async () => {
				const { model, getCapturedStreamParams } = createIntegrationMockModel()

				const wrapped = withSupermemory(model, INTEGRATION_CONFIG.containerTag, {
					apiKey: INTEGRATION_CONFIG.apiKey,
					mode: "profile",
				})

				const { stream } = await wrapped.doStream({
					prompt: [
						{
							role: "user",
							content: [{ type: "text", text: "Stream test message" }],
						},
					],
				})

				// Consume the stream
				const reader = stream.getReader()
				const chunks: Array<{ type: string; delta?: string }> = []
				while (true) {
					const { done, value } = await reader.read()
					if (done) break
					chunks.push(value as { type: string; delta?: string })
				}

				const capturedParams = getCapturedStreamParams()
				expect(capturedParams).not.toBeNull()
				expect(capturedParams?.prompt[0]?.role).toBe("system")
				expect(chunks.some((c) => c.type === "text-delta")).toBe(true)
			})

			it("should capture streamed text and save memory when addMemory is always", async () => {
				const { model } = createIntegrationMockModel()
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const conversationId = `test-stream-${Date.now()}`

				const wrapped = withSupermemory(model, INTEGRATION_CONFIG.containerTag, {
					apiKey: INTEGRATION_CONFIG.apiKey,
					mode: "profile",
					addMemory: "always",
					conversationId,
				})

				const { stream } = await wrapped.doStream({
					prompt: [
						{
							role: "user",
							content: [{ type: "text", text: "Stream and save this memory" }],
						},
					],
				})

				// Consume the stream to trigger flush
				const reader = stream.getReader()
				while (true) {
					const { done } = await reader.read()
					if (done) break
				}

				// Wait for background save
				await new Promise((resolve) => setTimeout(resolve, 2000))

				// Verify save was attempted
				const conversationCalls = fetchSpy.mock.calls.filter(
					(call) =>
						typeof call[0] === "string" &&
						call[0].includes("/v4/conversations"),
				)
				expect(conversationCalls.length).toBeGreaterThan(0)

				fetchSpy.mockRestore()
			})

			it("should handle text-delta chunks correctly", async () => {
				const { model } = createIntegrationMockModel()

				const wrapped = withSupermemory(model, INTEGRATION_CONFIG.containerTag, {
					apiKey: INTEGRATION_CONFIG.apiKey,
					mode: "profile",
				})

				const { stream } = await wrapped.doStream({
					prompt: [
						{
							role: "user",
							content: [{ type: "text", text: "Test chunk handling" }],
						},
					],
				})

				const reader = stream.getReader()
				const textDeltas: string[] = []
				while (true) {
					const { done, value } = await reader.read()
					if (done) break
					if (
						(value as { type: string; delta?: string }).type === "text-delta"
					) {
						textDeltas.push(
							(value as { type: string; delta?: string }).delta || "",
						)
					}
				}

				expect(textDeltas.join("")).toBe("Mock streamed response")
			})
		})

		describe("Mode variations", () => {
			it("profile mode should fetch profile memories", async () => {
				const { model } = createIntegrationMockModel()
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const wrapped = withSupermemory(model, INTEGRATION_CONFIG.containerTag, {
					apiKey: INTEGRATION_CONFIG.apiKey,
					mode: "profile",
				})

				await wrapped.doGenerate({
					prompt: [
						{
							role: "user",
							content: [{ type: "text", text: "Profile mode test" }],
						},
					],
				})

				// Verify /v4/profile was called
				const profileCalls = fetchSpy.mock.calls.filter(
					(call) =>
						typeof call[0] === "string" && call[0].includes("/v4/profile"),
				)
				expect(profileCalls.length).toBeGreaterThan(0)

				// Verify the request body does NOT contain 'q' for profile mode
				const profileCall = profileCalls[0]
				if (profileCall?.[1]) {
					const body = JSON.parse((profileCall[1] as RequestInit).body as string)
					expect(body.q).toBeUndefined()
				}

				fetchSpy.mockRestore()
			})

			it("query mode should include query in search", async () => {
				const { model } = createIntegrationMockModel()
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const wrapped = withSupermemory(model, INTEGRATION_CONFIG.containerTag, {
					apiKey: INTEGRATION_CONFIG.apiKey,
					mode: "query",
				})

				await wrapped.doGenerate({
					prompt: [
						{
							role: "user",
							content: [{ type: "text", text: "What are my favorite foods?" }],
						},
					],
				})

				// Verify /v4/profile was called with query
				const profileCalls = fetchSpy.mock.calls.filter(
					(call) =>
						typeof call[0] === "string" && call[0].includes("/v4/profile"),
				)
				expect(profileCalls.length).toBeGreaterThan(0)

				// Verify the request body contains 'q'
				const profileCall = profileCalls[0]
				if (profileCall?.[1]) {
					const body = JSON.parse((profileCall[1] as RequestInit).body as string)
					expect(body.q).toBe("What are my favorite foods?")
				}

				fetchSpy.mockRestore()
			})

			it("full mode should include both profile and query", async () => {
				const { model } = createIntegrationMockModel()
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				const wrapped = withSupermemory(model, INTEGRATION_CONFIG.containerTag, {
					apiKey: INTEGRATION_CONFIG.apiKey,
					mode: "full",
				})

				await wrapped.doGenerate({
					prompt: [
						{
							role: "user",
							content: [{ type: "text", text: "Full mode query test" }],
						},
					],
				})

				// Verify /v4/profile was called with query
				const profileCalls = fetchSpy.mock.calls.filter(
					(call) =>
						typeof call[0] === "string" && call[0].includes("/v4/profile"),
				)
				expect(profileCalls.length).toBeGreaterThan(0)

				const profileCall = profileCalls[0]
				if (profileCall?.[1]) {
					const body = JSON.parse((profileCall[1] as RequestInit).body as string)
					expect(body.q).toBe("Full mode query test")
				}

				fetchSpy.mockRestore()
			})
		})

		describe("Options", () => {
			it("promptTemplate should customize memory formatting", async () => {
				const { model, getCapturedGenerateParams } =
					createIntegrationMockModel()

				const customTemplate = (data: {
					userMemories: string
					generalSearchMemories: string
				}) => `<custom-memories>${data.userMemories}</custom-memories>`

				const wrapped = withSupermemory(model, INTEGRATION_CONFIG.containerTag, {
					apiKey: INTEGRATION_CONFIG.apiKey,
					mode: "profile",
					promptTemplate: customTemplate,
				})

				await wrapped.doGenerate({
					prompt: [
						{
							role: "user",
							content: [{ type: "text", text: "Custom template test" }],
						},
					],
				})

				const capturedParams = getCapturedGenerateParams()
				expect(capturedParams?.prompt[0]?.content).toMatch(
					/<custom-memories>.*<\/custom-memories>/s,
				)
			})

			it("verbose mode should not break functionality", async () => {
				const { model, getCapturedGenerateParams } =
					createIntegrationMockModel()

				const wrapped = withSupermemory(model, INTEGRATION_CONFIG.containerTag, {
					apiKey: INTEGRATION_CONFIG.apiKey,
					mode: "profile",
					verbose: true,
				})

				await wrapped.doGenerate({
					prompt: [
						{
							role: "user",
							content: [{ type: "text", text: "Verbose mode test" }],
						},
					],
				})

				const capturedParams = getCapturedGenerateParams()
				expect(capturedParams).not.toBeNull()
				expect(model.doGenerate).toHaveBeenCalledTimes(1)
			})

			it("custom baseUrl should be used for API calls", async () => {
				const { model } = createIntegrationMockModel()
				const fetchSpy = vi.spyOn(globalThis, "fetch")

				// Use the configured base URL (or default)
				const wrapped = withSupermemory(model, INTEGRATION_CONFIG.containerTag, {
					apiKey: INTEGRATION_CONFIG.apiKey,
					mode: "profile",
					baseUrl: INTEGRATION_CONFIG.baseUrl,
				})

				await wrapped.doGenerate({
					prompt: [
						{
							role: "user",
							content: [{ type: "text", text: "Base URL test" }],
						},
					],
				})

				// Verify the correct base URL was used
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

		describe("Error scenarios", () => {
			it("should propagate model errors", async () => {
				const { model } = createIntegrationMockModel()

				// Override doGenerate to throw an error
				vi.mocked(model.doGenerate).mockRejectedValueOnce(
					new Error("Model error"),
				)

				const wrapped = withSupermemory(model, INTEGRATION_CONFIG.containerTag, {
					apiKey: INTEGRATION_CONFIG.apiKey,
					mode: "profile",
				})

				await expect(
					wrapped.doGenerate({
						prompt: [
							{
								role: "user",
								content: [{ type: "text", text: "Error test" }],
							},
						],
					}),
				).rejects.toThrow("Model error")
			})

			it("should handle invalid API key gracefully", async () => {
				const { model } = createIntegrationMockModel()

				const wrapped = withSupermemory(model, INTEGRATION_CONFIG.containerTag, {
					apiKey: "invalid-api-key-12345",
					mode: "profile",
				})

				await expect(
					wrapped.doGenerate({
						prompt: [
							{
								role: "user",
								content: [{ type: "text", text: "Invalid key test" }],
							},
						],
					}),
				).rejects.toThrow()
			})
		})
	},
)
