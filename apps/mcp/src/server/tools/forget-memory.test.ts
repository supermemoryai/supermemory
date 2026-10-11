import { describe, expect, it, vi } from "vitest"
import { z } from "zod"
import * as addMemory from "./add-memory"
import { MEMORY_TOOL_ANNOTATIONS } from "./annotations"
import { namespaceArg } from "./compat"
import * as forgetMemory from "./forget-memory"
import { errorResult, type ToolDeps } from "./types"

function setup() {
	const tools = new Map<
		string,
		{
			config: {
				description: string
				inputSchema: z.ZodObject<z.ZodRawShape>
				outputSchema: z.ZodTypeAny
				annotations: typeof MEMORY_TOOL_ANNOTATIONS
			}
			cb: (args: Record<string, unknown>) => Promise<unknown>
		}
	>()
	const client = {
		createMemory: vi.fn().mockResolvedValue({
			id: "d1",
			status: "queued",
			namespace: "active",
		}),
		forgetMemory: vi.fn().mockResolvedValue({
			success: true,
			namespace: "active",
			message: "Memory forgotten",
		}),
	}
	const deps = {
		server: {
			registerTool: (name: string, config: unknown, cb: unknown) => {
				tools.set(name, { config, cb } as NonNullable<
					ReturnType<typeof tools.get>
				>)
			},
		},
		getClient: vi.fn(() => client),
		resolveNamespace: vi.fn(async (explicit?: string) => explicit ?? "active"),
		errorResult,
	} as unknown as ToolDeps
	addMemory.register(deps)
	forgetMemory.register(deps)
	const getTool = (name: string) => {
		const tool = tools.get(name)
		if (!tool) throw new Error(`${name} not registered`)
		return tool
	}
	return { tools, getTool, deps, client }
}

describe("separate memory operations", () => {
	it("exposes save and forget with descriptions, schemas, and safety hints", () => {
		const { tools, getTool } = setup()
		expect([...tools.keys()]).toEqual(["add_memory", "forget_memory"])
		for (const tool of tools.values()) {
			expect(tool.config.description.length).toBeGreaterThan(0)
			expect(tool.config.annotations).toEqual(MEMORY_TOOL_ANNOTATIONS)
			expect(tool.config.inputSchema.safeParse({}).success).toBe(false)
			expect(
				tool.config.inputSchema.safeParse({ content: "x".repeat(200001) })
					.success,
			).toBe(false)
		}
		const schema = z.toJSONSchema(getTool("forget_memory").config.inputSchema)
		expect(schema.properties).not.toHaveProperty("action")
	})

	it("saves by default without forgetting", async () => {
		const { getTool, client } = setup()
		const tool = getTool("add_memory")
		const result = await tool.cb(
			tool.config.inputSchema.parse({ content: "A fact" }),
		)
		expect(client.createMemory).toHaveBeenCalledWith("A fact")
		expect(client.forgetMemory).not.toHaveBeenCalled()
		expect(result).toMatchObject({
			structuredContent: { action: "save", id: "d1" },
		})
	})

	it.each([
		[{}, "active"],
		[{ namespace: "explicit" }, "explicit"],
		[{ containerTag: "legacy" }, "legacy"],
		[{ namespace: "explicit", containerTag: "legacy" }, "explicit"],
	])("forgets in the resolved space for %j", async (scope, namespace) => {
		const { getTool, deps, client } = setup()
		const tool = getTool("forget_memory")
		const result = await tool.cb(
			tool.config.inputSchema.parse({ content: "Old fact", ...scope }),
		)
		expect(deps.resolveNamespace).toHaveBeenCalledWith(namespaceArg(scope))
		expect(deps.getClient).toHaveBeenCalledWith(namespace)
		expect(client.forgetMemory).toHaveBeenCalledWith("Old fact")
		expect(client.createMemory).not.toHaveBeenCalled()
		expect(result).toMatchObject({
			structuredContent: {
				action: "forget",
				containerTag: "active",
				success: true,
			},
		})
		expect(
			tool.config.outputSchema.safeParse(
				(result as { structuredContent: unknown }).structuredContent,
			).success,
		).toBe(true)
	})

	it("preserves the legacy forget action and response", async () => {
		const { getTool, client } = setup()
		const invoke = (name: string, args: Record<string, unknown>) => {
			const tool = getTool(name)
			return tool.cb(tool.config.inputSchema.parse(args))
		}
		const legacy = await invoke("add_memory", {
			content: "Old fact",
			action: "forget",
		})
		const separate = await invoke("forget_memory", { content: "Old fact" })
		expect(legacy).toEqual(separate)
		expect(client.createMemory).not.toHaveBeenCalled()
	})

	it("returns unsuccessful forget results without saving", async () => {
		const { getTool, client } = setup()
		client.forgetMemory.mockResolvedValueOnce({
			success: false,
			namespace: "active",
			message: "No matching memory found",
		})
		const result = await getTool("forget_memory").cb({ content: "Missing" })
		expect(result).toMatchObject({ structuredContent: { success: false } })
		expect(client.createMemory).not.toHaveBeenCalled()
	})

	it("returns errors from namespace resolution and the client", async () => {
		const { getTool, deps, client } = setup()
		vi.mocked(deps.resolveNamespace).mockRejectedValueOnce(new Error("Denied"))
		expect(await getTool("forget_memory").cb({ content: "Old fact" })).toEqual(
			errorResult(new Error("Denied")),
		)
		expect(client.forgetMemory).not.toHaveBeenCalled()
		client.forgetMemory.mockRejectedValueOnce(new Error("Unavailable"))
		expect(await getTool("forget_memory").cb({ content: "Old fact" })).toEqual(
			errorResult(new Error("Unavailable")),
		)
	})
})
