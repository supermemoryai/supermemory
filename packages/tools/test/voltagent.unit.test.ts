import { jsonResponse, profileBody } from "./v5-fetch"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createSupermemoryHooks, withSupermemory } from "../src/voltagent"

type PrepareArgs = Parameters<
	NonNullable<ReturnType<typeof createSupermemoryHooks>["onPrepareMessages"]>
>[0]

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

describe("VoltAgent memory context", () => {
	afterEach(() => vi.unstubAllGlobals())

	it("hooks append the recall as a separate user message and leave every message untouched", async () => {
		const fetchMock = vi.fn(async () =>
			jsonResponse(profileBody(["Fresh profile fact"])),
		)
		vi.stubGlobal("fetch", fetchMock)
		const hooks = createSupermemoryHooks("user-a", {
			id: "conversation-a",
			apiKey: "sm_test_key",
			mode: "profile",
			addMemory: "never",
		})

		const system = {
			id: "system",
			role: "system",
			parts: [{ type: "text", text: "Be helpful." }],
		}
		const firstUser = {
			id: "u1",
			role: "user",
			parts: [{ type: "text", text: "Remember me" }],
		}
		const prepare = (messages: unknown[]) =>
			hooks.onPrepareMessages?.({
				agent: { name: "test-agent" },
				context: { conversationId: "conversation-a" },
				messages,
			} as unknown as PrepareArgs)

		const first = await prepare([system, firstUser])

		expect(first?.messages?.slice(0, 2)).toEqual([system, firstUser])
		expect(first?.messages).toHaveLength(3)
		expect(first?.messages?.[2]).toMatchObject({ role: "user" })
		expect(JSON.stringify(first?.messages?.[2])).toContain("Fresh profile fact")
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it("withSupermemory wraps a model object and adds no message hook", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => jsonResponse(profileBody(["Fresh profile fact"]))),
		)
		const inner = createModel()
		const config = withSupermemory({
			agentConfig: {
				name: "agent",
				instructions: "Be helpful.",
				model: inner as never,
			},
			namespace: "user-a",
			id: "conversation-a",
			apiKey: "sm_test_key",
			addMemory: "never",
		})
		const model = config.model as unknown as ReturnType<typeof createModel>
		const prompt = [
			{ role: "user", content: [{ type: "text", text: "Hello" }] },
		]

		const result = (await model.doGenerate({ prompt } as never)) as {
			content: Array<{ providerMetadata?: Record<string, unknown> }>
		}

		expect(config.hooks.onPrepareMessages).toBeUndefined()
		expect(config.hooks.onEnd).toBeDefined()
		const sent = (inner.doGenerate.mock.calls[0] as unknown[])[0] as {
			prompt: unknown[]
		}
		expect(sent.prompt[0]).toEqual(prompt[0])
		expect(JSON.stringify(sent.prompt[1])).toContain("Fresh profile fact")
		expect(result.content[0]?.providerMetadata).toHaveProperty("supermemory")
	})

	it("withSupermemory falls back to the message hook for a model id string", () => {
		const config = withSupermemory({
			agentConfig: {
				name: "agent",
				instructions: "Be helpful.",
				model: "openai/gpt-4o",
			},
			namespace: "user-a",
			id: "conversation-a",
			apiKey: "sm_test_key",
		})

		expect(config.model).toBe("openai/gpt-4o")
		expect(config.hooks.onPrepareMessages).toBeDefined()
	})
})
