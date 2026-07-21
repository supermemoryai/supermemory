import { afterAll, beforeAll, describe, expect, it } from "vitest"
import {
	AUTH_CREDENTIALS_AVAILABLE,
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
const describeWithAuth = describe.skipIf(!AUTH_CREDENTIALS_AVAILABLE)

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
