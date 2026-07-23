import { beforeEach, describe, expect, it, vi } from "vitest"

const sdk = vi.hoisted(() => ({
	add: vi.fn(),
	forget: vi.fn(),
	search: vi.fn(),
}))

const analytics = vi.hoisted(() => ({
	memoryAdded: vi.fn(),
	memoryForgot: vi.fn(),
	memorySearch: vi.fn(),
}))

vi.mock("supermemory", () => ({
	default: class {
		add = sdk.add
		memories = { forget: sdk.forget }
		search = { memories: sdk.search }
	},
}))

vi.mock("agents/mcp", () => ({ McpAgent: class {} }))
vi.mock("../dist/mcp-app.html", () => ({ default: "" }))
vi.mock("./posthog", () => ({
	initPosthog: vi.fn(),
	posthog: {
		...analytics,
	},
}))

import { SupermemoryClient } from "./client"
import { SupermemoryMCP } from "./server"

type MemoryArgs = {
	content: string
	action?: "save" | "forget"
	confirmationToken?: string
	containerTag?: string
}

type ToolResult = {
	content: Array<{ type: "text"; text: string }>
	isError?: boolean
}

const handleMemory = Reflect.get(SupermemoryMCP.prototype, "handleMemory") as (
	args: MemoryArgs,
) => Promise<ToolResult>

function statusError(status: number): Error & { status: number } {
	return Object.assign(new Error(`status ${status}`), { status })
}

function tokenFrom(message: string): string {
	const token = message.match(/confirmationToken: (\S+)/)?.[1]
	if (!token) throw new Error("preview did not contain a confirmation token")
	return token
}

function serverHarness(capabilities?: { elicitation?: { form?: object } }) {
	const client = {
		createMemory: vi.fn(),
		forgetMemory: vi.fn(),
	}
	const elicitInput = vi.fn()
	const getClient = vi.fn(() => client)
	return {
		client,
		elicitInput,
		getClient,
		server: {
			props: { userId: "user-1" },
			cachedContainerTags: [],
			server: {
				server: {
					getClientCapabilities: () => capabilities,
					elicitInput,
				},
			},
			getClient,
			getClientInfo: vi.fn(async () => null),
			getMcpSessionId: vi.fn(() => undefined),
			refreshContainerTags: vi.fn(async () => undefined),
		},
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	vi.useRealTimers()
	analytics.memoryAdded.mockResolvedValue(undefined)
	analytics.memoryForgot.mockResolvedValue(undefined)
	analytics.memorySearch.mockResolvedValue(undefined)
})

describe("signed forget confirmations", () => {
	it("previews a long candidate unambiguously and accepts its valid token", async () => {
		const content = "near-match query"
		const candidate = `${"same-prefix ".repeat(20)}unique-tail`
		sdk.forget.mockRejectedValueOnce(statusError(404))
		sdk.search.mockResolvedValueOnce({
			results: [{ id: "memory-1", memory: candidate, similarity: 0.97 }],
			total: 1,
			timing: 1,
		})
		const client = new SupermemoryClient("secret", "project-a")

		const preview = await client.forgetMemory(content)
		expect(preview.success).toBe(false)
		expect(preview.message).toContain("unique-tail")
		const token = tokenFrom(preview.message)

		sdk.forget.mockResolvedValueOnce({ id: "memory-1" })
		const confirmed = await client.forgetMemory(content, token)
		sdk.forget.mockRejectedValueOnce(statusError(404))
		const replayed = await client.forgetMemory(content, token)

		expect(confirmed.success).toBe(true)
		expect(replayed.success).toBe(false)
		expect(replayed.message).toContain("No memory exists with ID memory-1")
		expect(sdk.forget).toHaveBeenLastCalledWith({
			id: "memory-1",
			containerTag: "project-a",
		})
	})

	it("rejects altered, cross-container, wrong-key, tampered, and expired tokens without deleting", async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date("2026-07-23T00:00:00Z"))
		sdk.forget.mockRejectedValueOnce(statusError(404))
		sdk.search.mockResolvedValueOnce({
			results: [{ id: "memory-1", memory: "candidate", similarity: 0.99 }],
			total: 1,
			timing: 1,
		})
		const client = new SupermemoryClient("secret", "project-a")
		const preview = await client.forgetMemory("query")
		const token = tokenFrom(preview.message)
		const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`

		const rejected = [
			await client.forgetMemory("altered", token),
			await new SupermemoryClient("secret", "project-b").forgetMemory(
				"query",
				token,
			),
			await new SupermemoryClient("other-secret", "project-a").forgetMemory(
				"query",
				token,
			),
			await client.forgetMemory("query", "malformed"),
			await client.forgetMemory("query", tampered),
		]
		vi.advanceTimersByTime(5 * 60 * 1000 + 1)
		rejected.push(await client.forgetMemory("query", token))

		expect(rejected.every((result) => !result.success)).toBe(true)
		expect(sdk.forget).toHaveBeenCalledTimes(1)
	})

	it("keeps exact forget as one call and propagates non-404 failures", async () => {
		const client = new SupermemoryClient("secret", "project-a")
		sdk.forget.mockResolvedValueOnce({ id: "memory-1" })

		const exact = await client.forgetMemory("exact content")

		expect(exact.success).toBe(true)
		expect(sdk.forget).toHaveBeenCalledTimes(1)
		expect(sdk.search).not.toHaveBeenCalled()

		sdk.forget.mockRejectedValueOnce(statusError(500))
		await expect(client.forgetMemory("failure")).rejects.toThrow(
			/service may be temporarily unavailable/i,
		)
		expect(sdk.search).not.toHaveBeenCalled()
	})
})

describe("memory tool confirmation contract", () => {
	it("rejects a confirmation token outside the forget action without creating data", async () => {
		const harness = serverHarness()

		const result = await handleMemory.call(harness.server, {
			content: "query",
			confirmationToken: "token",
		})

		expect(result.isError).toBe(true)
		expect(result.content[0]?.text).toContain("requires action 'forget'")
		expect(harness.getClient).not.toHaveBeenCalled()
		expect(harness.client.createMemory).not.toHaveBeenCalled()
	})

	it("marks failed token confirmations as tool errors but keeps previews non-errors", async () => {
		const harness = serverHarness()
		harness.client.forgetMemory.mockResolvedValue({
			success: false,
			message: "Invalid or expired forget confirmation. No changes were made.",
			containerTag: "project-a",
		})

		const invalid = await handleMemory.call(harness.server, {
			content: "query",
			action: "forget",
			confirmationToken: "invalid",
		})
		const preview = await handleMemory.call(harness.server, {
			content: "query",
			action: "forget",
		})

		expect(invalid.isError).toBe(true)
		expect(preview.isError).toBeUndefined()
		expect(analytics.memoryForgot).not.toHaveBeenCalled()
	})

	it("requires an elicited yes before deleting when the client supports it", async () => {
		const harness = serverHarness({ elicitation: { form: {} } })
		harness.elicitInput.mockResolvedValueOnce({ action: "decline" })

		const declined = await handleMemory.call(harness.server, {
			content: "query",
			action: "forget",
			confirmationToken: "token",
		})

		expect(declined.isError).toBeUndefined()
		expect(declined.content[0]?.text).toContain("cancelled")
		expect(harness.client.forgetMemory).not.toHaveBeenCalled()

		harness.elicitInput.mockResolvedValueOnce({
			action: "accept",
			content: { confirm: true },
		})
		harness.client.forgetMemory.mockResolvedValueOnce({
			success: true,
			message: "Successfully forgot memory with ID: memory-1",
			containerTag: "project-a",
		})

		const accepted = await handleMemory.call(harness.server, {
			content: "query",
			action: "forget",
			confirmationToken: "token",
		})

		expect(accepted.isError).toBeUndefined()
		expect(harness.client.forgetMemory).toHaveBeenCalledOnce()
		expect(analytics.memoryForgot).toHaveBeenCalledOnce()
	})
})
