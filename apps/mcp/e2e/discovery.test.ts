import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
	OAUTH_CREDENTIALS_AVAILABLE,
	callTool,
	connect,
	textOf,
	type Session,
} from "./helpers"

const EXPECTED_TOOLS = [
	"add_memory",
	"search_memory",
	"listSpaces",
	"whoAmI",
	"memory-graph",
]
const describeWithAuth = describe.skipIf(!OAUTH_CREDENTIALS_AVAILABLE)

const READ_ONLY_TOOL_NAMES = [
	"search_memory",
	"listMemories",
	"listSpaces",
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

describeWithAuth("MCP — discovery & identity", () => {
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

	it("marks add_memory as mutating", async () => {
		const { tools } = await s.client.listTools()
		const memory = tools.find((t) => t.name === "add_memory")
		expect(memory?.annotations).toMatchObject(MEMORY_TOOL_ANNOTATIONS)
	})

	it("lists profile and container-tag resources", async () => {
		const { resources } = await s.client.listResources()
		const uris = resources.map((r) => r.uri)
		expect(uris).toContain("supermemory://profile")
		expect(uris).toContain("supermemory://container-tags")
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

	it("listSpaces returns content", async () => {
		const res = await callTool(s.client, "listSpaces")
		expect(res.isError).toBeFalsy()
		expect(textOf(res).length).toBeGreaterThan(0)
	})
})
