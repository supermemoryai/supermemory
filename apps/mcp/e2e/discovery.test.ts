import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { API_KEY, callTool, connect, textOf, type Session } from "./helpers"

const EXPECTED_TOOLS = [
	"memory",
	"recall",
	"listMemories",
	"listProjects",
	"whoAmI",
	"memory-graph",
]

const READ_ONLY_TOOL_NAMES = [
	"recall",
	"listMemories",
	"listProjects",
	"whoAmI",
	"memory-graph",
]

const READ_ONLY_ANNOTATIONS = {
	readOnlyHint: true,
	destructiveHint: false,
	idempotentHint: true,
	openWorldHint: false,
}

const MEMORY_TOOL_ANNOTATIONS = {
	readOnlyHint: false,
	destructiveHint: true,
	idempotentHint: false,
	openWorldHint: false,
}

describe.skipIf(!API_KEY)("MCP — discovery & identity", () => {
	let s: Session

	beforeAll(async () => {
		s = await connect()
	})
	afterAll(async () => {
		await s?.close()
	})

	it("handshakes and lists the expected tools", async () => {
		const { tools } = await s.client.listTools()
		const names = tools.map((t) => t.name)
		for (const t of EXPECTED_TOOLS) expect(names).toContain(t)
	})

	it("marks read-only tools as non-destructive", async () => {
		const { tools } = await s.client.listTools()
		for (const name of READ_ONLY_TOOL_NAMES) {
			const tool = tools.find((t) => t.name === name)
			expect(tool?.annotations).toMatchObject(READ_ONLY_ANNOTATIONS)
		}
	})

	it("marks memory as mutating", async () => {
		const { tools } = await s.client.listTools()
		const memory = tools.find((t) => t.name === "memory")
		expect(memory?.annotations).toMatchObject(MEMORY_TOOL_ANNOTATIONS)
	})

	it("lists profile & projects resources", async () => {
		const { resources } = await s.client.listResources()
		const uris = resources.map((r) => r.uri)
		expect(uris).toContain("supermemory://profile")
		expect(uris).toContain("supermemory://projects")
	})

	it("lists the context prompt", async () => {
		const { prompts } = await s.client.listPrompts()
		expect(prompts.map((p) => p.name)).toContain("context")
	})

	it("whoAmI resolves to the authenticated account", async () => {
		const res = await callTool(s.client, "whoAmI")
		expect(res.isError).toBeFalsy()
		const parsed = JSON.parse(textOf(res))
		expect(parsed.userId).toBeTruthy()
	})

	it("listProjects returns content", async () => {
		const res = await callTool(s.client, "listProjects", { refresh: true })
		expect(res.isError).toBeFalsy()
		expect(textOf(res).length).toBeGreaterThan(0)
	})
})
