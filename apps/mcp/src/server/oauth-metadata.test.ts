import { describe, expect, it, vi } from "vitest"
import app from "./index"
import { PROTECTED_RESOURCE_METADATA_PATH } from "./oauth-metadata"
import type { ServerEnv } from "./types"

vi.mock("cloudflare:workers", () => ({ DurableObject: class {} }))
vi.mock("../../dist/src/widget/index.html", () => ({ default: "" }))

describe("OAuth protected-resource metadata challenge", () => {
	it("ignores spoofed forwarding headers", async () => {
		const resource = "https://mcp.example.com/mcp"
		const response = await app.request(
			"https://mcp.example.com/mcp",
			{
				method: "POST",
				headers: {
					host: "attacker.example",
					"x-forwarded-host": "attacker.example",
					"x-forwarded-proto": "http",
				},
			},
			{ MCP_RESOURCE: resource } as ServerEnv,
		)

		expect(response.status).toBe(401)
		expect(response.headers.get("WWW-Authenticate")).toBe(
			`Bearer resource_metadata="https://mcp.example.com${PROTECTED_RESOURCE_METADATA_PATH}/mcp"`,
		)
	})

	it("keeps discovery aligned behind a trusted proxy", async () => {
		const resource = "https://memory.example.com/gateway/mcp/?tenant=acme"
		const metadataUrl =
			"https://memory.example.com/.well-known/oauth-protected-resource/gateway/mcp/?tenant=acme"
		const env = { MCP_RESOURCE: resource } as ServerEnv
		const response = await app.request(
			"http://worker.internal/mcp",
			{ method: "POST" },
			env,
		)

		expect(response.status).toBe(401)
		expect(response.headers.get("WWW-Authenticate")).toBe(
			`Bearer resource_metadata="${metadataUrl}"`,
		)

		const metadataResponse = await app.request(metadataUrl, undefined, env)
		expect(metadataResponse.status).toBe(200)
		await expect(metadataResponse.json()).resolves.toMatchObject({ resource })

		const rootFallbackResponse = await app.request(
			`https://memory.example.com${PROTECTED_RESOURCE_METADATA_PATH}`,
			undefined,
			env,
		)
		expect(rootFallbackResponse.status).toBe(200)

		for (const mismatchedUrl of [
			metadataUrl.replace("tenant=acme", "tenant=other"),
			metadataUrl.replace("/gateway/mcp/", "/other/"),
			`https://memory.example.com${PROTECTED_RESOURCE_METADATA_PATH}?tenant=acme`,
		]) {
			const mismatchedResponse = await app.request(
				mismatchedUrl,
				undefined,
				env,
			)
			expect(mismatchedResponse.status).toBe(404)
		}
	})

	it("supports a resource identifier without a path", async () => {
		const resource = "https://mcp.example.com"
		const response = await app.request(resource, { method: "POST" }, {
			MCP_RESOURCE: resource,
		} as ServerEnv)

		expect(response.status).toBe(401)
		expect(response.headers.get("WWW-Authenticate")).toBe(
			`Bearer resource_metadata="https://mcp.example.com${PROTECTED_RESOURCE_METADATA_PATH}"`,
		)

		const metadataResponse = await app.request(
			`https://mcp.example.com${PROTECTED_RESOURCE_METADATA_PATH}`,
			undefined,
			{ MCP_RESOURCE: resource } as ServerEnv,
		)
		expect(metadataResponse.status).toBe(200)
		await expect(metadataResponse.json()).resolves.toMatchObject({ resource })
	})
})
