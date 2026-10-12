import {
	CLIENT_CAPABILITIES_META_KEY,
	isInputRequiredResult,
} from "@modelcontextprotocol/server"
import { describe, expect, it, vi } from "vitest"
import type { z } from "zod"
import * as addMemory from "./add-memory"
import * as forgetMemory from "./forget-memory"
import type { ToolDeps } from "./types"
import { errorResult } from "./types"

type Registered = {
	config: { outputSchema: z.ZodTypeAny }
	cb: (
		args: Record<string, unknown>,
		context: unknown,
	) => Promise<Record<string, unknown>>
}

const candidate = { id: "m1", memory: "User lives in Pune" }

function fakeDeps() {
	const tools = new Map<string, Registered>()
	const client = {
		findMemoryToForget: vi.fn().mockResolvedValue(candidate),
		getMemory: vi.fn(async (id: string) => (id === "m1" ? candidate : null)),
		forgetMemoryById: vi.fn().mockResolvedValue({
			success: true,
			message: 'Forgot memory (ID: m1): "User lives in Pune"',
			namespace: "active",
		}),
	}
	const deps = {
		server: {
			registerTool: (name: string, config: unknown, cb: unknown) => {
				tools.set(name, { config, cb } as Registered)
			},
		},
		getClient: vi.fn(() => client),
		resolveNamespace: vi.fn(async (explicit?: string) => explicit ?? "active"),
		errorResult,
	} as unknown as ToolDeps
	forgetMemory.register(deps)
	addMemory.register(deps)
	const tool = (name: string) => tools.get(name) as Registered
	return { tool, client }
}

// A 2026-era client that declared elicitation, optionally answering a previous prompt.
function elicitingContext(
	answer?: Record<string, unknown>,
	requestState?: string,
) {
	return {
		mcpReq: {
			envelope: { [CLIENT_CAPABILITIES_META_KEY]: { elicitation: {} } },
			inputResponses: answer ? { confirm_forget: answer } : undefined,
			requestState: () => requestState,
		},
	}
}

describe("forget_memory without elicitation", () => {
	it("only previews the match on the first call", async () => {
		const { tool, client } = fakeDeps()
		const forget = tool("forget_memory")

		const result = await forget.cb({ content: "where I live" }, {})

		expect(client.forgetMemoryById).not.toHaveBeenCalled()
		const output = forget.config.outputSchema.parse(result.structuredContent)
		expect(output).toMatchObject({
			success: false,
			status: "confirmation_required",
			id: "m1",
			memory: "User lives in Pune",
		})
	})

	it("forgets once called again with the previewed id and confirm", async () => {
		const { tool, client } = fakeDeps()
		const forget = tool("forget_memory")

		const result = await forget.cb({ id: "m1", confirm: true }, {})

		expect(client.forgetMemoryById).toHaveBeenCalledWith(candidate)
		expect(result.structuredContent).toMatchObject({
			success: true,
			status: "forgotten",
		})
	})

	it("does not treat confirm on a content match as consent", async () => {
		const { tool, client } = fakeDeps()

		const result = await tool("forget_memory").cb(
			{ content: "where I live", confirm: true },
			{},
		)

		expect(client.forgetMemoryById).not.toHaveBeenCalled()
		expect(result.structuredContent).toMatchObject({
			status: "confirmation_required",
		})
	})

	it("reports a missing memory without forgetting anything", async () => {
		const { tool, client } = fakeDeps()

		const result = await tool("forget_memory").cb(
			{ id: "gone", confirm: true },
			{},
		)

		expect(client.forgetMemoryById).not.toHaveBeenCalled()
		expect(result.structuredContent).toMatchObject({ status: "not_found" })
	})

	it("rejects calls with neither id nor content", async () => {
		const { tool } = fakeDeps()

		const result = await tool("forget_memory").cb({}, {})

		expect(result.isError).toBe(true)
	})

	it("routes the legacy add_memory forget action through confirmation", async () => {
		const { tool, client } = fakeDeps()

		const result = await tool("add_memory").cb(
			{ content: "where I live", action: "forget" },
			{},
		)

		expect(client.forgetMemoryById).not.toHaveBeenCalled()
		expect(result.structuredContent).toMatchObject({
			status: "confirmation_required",
		})
	})
})

describe("forget_memory with elicitation", () => {
	it("asks the user before forgetting", async () => {
		const { tool, client } = fakeDeps()

		const result = await tool("forget_memory").cb(
			{ content: "where I live" },
			elicitingContext(),
		)

		expect(client.forgetMemoryById).not.toHaveBeenCalled()
		expect(isInputRequiredResult(result)).toBe(true)
		expect(result).toMatchObject({ requestState: "m1" })
		expect(JSON.stringify(result)).toContain("User lives in Pune")
	})

	it("ignores a model-supplied confirm and still asks the user", async () => {
		const { tool, client } = fakeDeps()

		const result = await tool("forget_memory").cb(
			{ id: "m1", confirm: true },
			elicitingContext(),
		)

		expect(client.forgetMemoryById).not.toHaveBeenCalled()
		expect(isInputRequiredResult(result)).toBe(true)
	})

	it("forgets after the user accepts", async () => {
		const { tool, client } = fakeDeps()

		const result = await tool("forget_memory").cb(
			{ content: "where I live" },
			elicitingContext({ action: "accept", content: { confirm: true } }, "m1"),
		)

		expect(client.forgetMemoryById).toHaveBeenCalledWith(candidate)
		expect(result.structuredContent).toMatchObject({ status: "forgotten" })
	})

	it.each([
		{ action: "decline" },
		{ action: "cancel" },
		{ action: "accept", content: { confirm: false } },
	])("keeps the memory when the user answers %o", async (answer) => {
		const { tool, client } = fakeDeps()

		const result = await tool("forget_memory").cb(
			{ content: "where I live" },
			elicitingContext(answer, "m1"),
		)

		expect(client.forgetMemoryById).not.toHaveBeenCalled()
		expect(result.structuredContent).toMatchObject({
			success: false,
			status: "cancelled",
		})
	})

	it("asks again when the match changed since the user was asked", async () => {
		const { tool, client } = fakeDeps()

		const result = await tool("forget_memory").cb(
			{ content: "where I live" },
			elicitingContext({ action: "accept", content: { confirm: true } }, "m0"),
		)

		expect(client.forgetMemoryById).not.toHaveBeenCalled()
		expect(isInputRequiredResult(result)).toBe(true)
	})
})
