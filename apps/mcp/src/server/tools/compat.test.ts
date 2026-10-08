import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import * as addMemory from "./add-memory"
import { namespaceArg, withLegacyView } from "./compat"
import * as listNamespaces from "./list-namespaces"
import * as setActiveTag from "./set-active-tag"
import type { ToolDeps } from "./types"
import { errorResult } from "./types"

type Registered = {
	config: { inputSchema: z.ZodTypeAny; outputSchema: z.ZodTypeAny }
	cb: (
		args: Record<string, unknown>,
		context: unknown,
	) => Promise<{
		structuredContent?: Record<string, unknown>
		isError?: boolean
	}>
}

function fakeDeps() {
	const tools = new Map<string, Registered>()
	const client = {
		createMemory: vi.fn().mockResolvedValue({
			id: "d1",
			status: "queued",
			namespace: "legacy_ns",
		}),
		listNamespaces: vi.fn().mockResolvedValue([
			{
				id: "1",
				namespace: "legacy_ns",
				description: null,
				documentCount: 2,
				memoryCount: 1,
				createdAt: "2026-01-01",
				updatedAt: "2026-01-02",
			},
		]),
	}
	const deps = {
		server: {
			registerTool: (name: string, config: unknown, cb: unknown) => {
				tools.set(name, { config, cb } as Registered)
			},
		},
		getClient: vi.fn(() => client),
		resolveNamespace: vi.fn(async (explicit?: string) => explicit ?? "active"),
		setActiveNamespace: vi.fn(async () => {}),
		errorResult,
	} as unknown as ToolDeps
	return { deps, tools, client }
}

// Shape a client that cached the pre-v5 tool list validates against
const legacyAddMemoryOutput = z.object({
	action: z.enum(["save", "forget"]),
	success: z.boolean(),
	containerTag: z.string(),
	message: z.string(),
})

describe("containerTag compatibility", () => {
	it("prefers namespace and falls back to the deprecated containerTag", () => {
		expect(namespaceArg({ namespace: "a", containerTag: "b" })).toBe("a")
		expect(namespaceArg({ containerTag: "b" })).toBe("b")
		expect(namespaceArg({})).toBeUndefined()
	})

	it("accepts containerTag input and ignores unknown keys", () => {
		const { deps, tools } = fakeDeps()
		addMemory.register(deps)
		const tool = tools.get("add_memory")
		if (!tool) throw new Error("add_memory not registered")
		const parsed = tool.config.inputSchema.parse({
			content: "hi",
			containerTag: "legacy_ns",
			somethingElse: 1,
		}) as { namespace?: string; containerTag?: string }
		expect(parsed.containerTag).toBe("legacy_ns")
		expect(parsed.namespace).toBeUndefined()
	})

	it("routes a containerTag-only call to that namespace and emits both keys", async () => {
		const { deps, tools } = fakeDeps()
		addMemory.register(deps)
		const tool = tools.get("add_memory")
		if (!tool) throw new Error("add_memory not registered")
		const result = await tool.cb(
			{ content: "hi", action: "save", containerTag: "legacy_ns" },
			{},
		)
		expect(deps.getClient).toHaveBeenCalledWith("legacy_ns")
		expect(result.structuredContent).toMatchObject({
			namespace: "legacy_ns",
			containerTag: "legacy_ns",
		})
		expect(() =>
			tool.config.outputSchema.parse(result.structuredContent),
		).not.toThrow()
		expect(() =>
			legacyAddMemoryOutput.parse(result.structuredContent),
		).not.toThrow()
	})

	it("treats containerTag as the required namespace for set-active-tag", async () => {
		const { deps, tools } = fakeDeps()
		setActiveTag.register(deps)
		const tool = tools.get("set-active-tag")
		if (!tool) throw new Error("set-active-tag not registered")
		const result = await tool.cb({ containerTag: "legacy_ns" }, {})
		expect(deps.setActiveNamespace).toHaveBeenCalledWith("legacy_ns")
		expect(result.structuredContent).toMatchObject({
			view: "confirmation",
			namespace: "legacy_ns",
			containerTag: "legacy_ns",
		})
		const missing = await tool.cb({}, {})
		expect(missing.isError).toBe(true)
	})

	it("lists spaces with both keys per item", async () => {
		const { deps, tools } = fakeDeps()
		listNamespaces.register(deps)
		const tool = tools.get("list_spaces")
		if (!tool) throw new Error("list_spaces not registered")
		const result = await tool.cb({}, {})
		expect(result.structuredContent?.spaces).toEqual([
			expect.objectContaining({
				namespace: "legacy_ns",
				containerTag: "legacy_ns",
			}),
		])
		expect(() =>
			tool.config.outputSchema.parse(result.structuredContent),
		).not.toThrow()
	})

	it("mirrors renamed view fields under their old names", () => {
		const picker = withLegacyView({
			view: "picker",
			namespaces: [
				{
					id: "1",
					namespace: "ns",
					documentCount: 0,
					memoryCount: 0,
					createdAt: "a",
					updatedAt: "b",
				},
			],
			activeNamespace: "ns",
			assignedNamespaces: [{ namespace: "ns", permission: "write" }],
		})
		expect(picker).toMatchObject({
			activeTag: "ns",
			containerTags: [{ namespace: "ns", containerTag: "ns" }],
			assignedTags: [{ namespace: "ns", containerTag: "ns" }],
		})
		expect(
			withLegacyView({
				view: "save",
				activeNamespace: "ns",
				writableNamespaces: ["ns"],
			}),
		).toMatchObject({ activeTag: "ns", writableTags: ["ns"] })
	})
})
