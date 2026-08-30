import { createServer, type Server } from "node:http"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { unstable_dev, type Unstable_DevWorker } from "wrangler"

const API_KEY = "sm_rate_limiter_runtime_test_key"
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 1

const initializeBody = JSON.stringify({
	jsonrpc: "2.0",
	id: 1,
	method: "initialize",
	params: {
		protocolVersion: "2024-11-05",
		capabilities: {},
		clientInfo: { name: "rate-limiter-test", version: "1.0.0" },
	},
})

function listen(server: Server): Promise<number> {
	return new Promise((resolve, reject) => {
		server.once("error", reject)
		server.listen(0, "127.0.0.1", () => {
			server.off("error", reject)
			const address = server.address()
			if (!address || typeof address === "string") {
				reject(new Error("Expected the auth test server to use a TCP port"))
				return
			}
			resolve(address.port)
		})
	})
}

function close(server: Server): Promise<void> {
	if (!server.listening) return Promise.resolve()
	return new Promise((resolve, reject) => {
		server.close((error) => (error ? reject(error) : resolve()))
	})
}

describe("rate limiter Worker/Durable Object integration", () => {
	let authServer: Server
	let worker: Unstable_DevWorker

	beforeAll(async () => {
		authServer = createServer((request, response) => {
			if (
				request.url !== "/v3/session" ||
				request.headers.authorization !== `Bearer ${API_KEY}`
			) {
				response.writeHead(404).end()
				return
			}

			response.writeHead(200, { "Content-Type": "application/json" }).end(
				JSON.stringify({
					user: { id: "user_rate_limiter_test" },
					org: { id: "org_rate_limiter_test" },
				}),
			)
		})

		const authPort = await listen(authServer)
		worker = await unstable_dev("src/server/index.ts", {
			config: "wrangler.jsonc",
			logLevel: "none",
			vars: {
				API_URL: `http://127.0.0.1:${authPort}`,
				RATE_LIMIT_MAX: String(RATE_LIMIT_MAX),
				RATE_LIMIT_WINDOW_MS: String(RATE_LIMIT_WINDOW_MS),
			},
			experimental: {
				disableDevRegistry: true,
				disableExperimentalWarning: true,
			},
		})
	}, 60_000)

	afterAll(async () => {
		await worker?.stop()
		if (authServer) await close(authServer)
	})

	it("allows the first RPC check and returns 429 with Retry-After when blocked", async () => {
		const request = () =>
			worker.fetch("http://example.com/mcp", {
				method: "POST",
				headers: {
					Accept: "application/json, text/event-stream",
					Authorization: `Bearer ${API_KEY}`,
					"Content-Type": "application/json",
				},
				body: initializeBody,
			})

		// This request reaches the configured Durable Object binding and exercises
		// stub.check(options) over Cloudflare RPC before the MCP handler runs.
		const allowed = await request()
		expect(allowed.status).toBe(200)

		const blocked = await request()
		expect(blocked.status).toBe(429)

		const retryAfter = blocked.headers.get("Retry-After")
		expect(retryAfter).toMatch(/^\d+$/)
		expect(Number(retryAfter)).toBeGreaterThan(0)
		expect(Number(retryAfter)).toBeLessThanOrEqual(RATE_LIMIT_WINDOW_MS / 1000)

		const body = (await blocked.json()) as {
			error?: { code?: number; message?: string }
		}
		expect(body.error?.code).toBe(-32002)
		expect(body.error?.message).toBe(
			`Rate limit exceeded. Retry after ${retryAfter} seconds.`,
		)
	})
})

describe("rate limiter direct Durable Object RPC", () => {
	let worker: Unstable_DevWorker

	beforeAll(async () => {
		worker = await unstable_dev("src/server/__rate-limit-test-entry.ts", {
			config: "wrangler.jsonc",
			logLevel: "none",
			vars: {
				RATE_LIMIT_MAX: String(RATE_LIMIT_MAX),
				RATE_LIMIT_WINDOW_MS: String(RATE_LIMIT_WINDOW_MS),
			},
			experimental: {
				disableDevRegistry: true,
				disableExperimentalWarning: true,
			},
		})
	}, 60_000)

	afterAll(async () => {
		await worker?.stop()
	})

	it("reports allowed for the first check and blocked for the second", async () => {
		const url = "http://example.com/__test/rate-limit?key=direct_rl_test"

		const allowed = await worker.fetch(url)
		expect(allowed.status).toBe(200)
		const allowedBody = (await allowed.json()) as {
			allowed: boolean
			remaining: number
			retryAfter: number
		}
		expect(allowedBody).toEqual({
			allowed: true,
			remaining: 0,
			retryAfter: 0,
		})

		const blocked = await worker.fetch(url)
		expect(blocked.status).toBe(200)
		const blockedBody = (await blocked.json()) as {
			allowed: boolean
			remaining: number
			retryAfter: number
		}
		expect(blockedBody).toEqual({
			allowed: false,
			remaining: 0,
			retryAfter: expect.any(Number),
		})
		expect(blockedBody.retryAfter).toBeGreaterThan(0)
		expect(blockedBody.retryAfter).toBeLessThanOrEqual(
			RATE_LIMIT_WINDOW_MS / 1000,
		)
	})
})
