import { describe, it } from "node:test"
import assert from "node:assert/strict"
import http from "node:http"
import {
	createLanDashboardProxy,
	isLoopbackHostname,
	parseArgs,
	parseListen,
	pickAuthorization,
} from "./lan-dashboard-proxy.mjs"

describe("isLoopbackHostname", () => {
	it("matches the self-hosted binary's local-auth Hosts", () => {
		assert.equal(isLoopbackHostname("localhost"), true)
		assert.equal(isLoopbackHostname("127.0.0.1"), true)
		assert.equal(isLoopbackHostname("::1"), true)
		assert.equal(isLoopbackHostname("[::1]"), true)
	})

	it("rejects LAN and public Hosts that currently 401", () => {
		assert.equal(isLoopbackHostname("192.168.1.10"), false)
		assert.equal(isLoopbackHostname("172.31.13.46"), false)
		assert.equal(isLoopbackHostname("10.0.0.5"), false)
		assert.equal(isLoopbackHostname("example.local"), false)
	})
})

describe("pickAuthorization", () => {
	it("keeps a caller-supplied header", () => {
		assert.equal(pickAuthorization("Bearer already", "sm_new"), "Bearer already")
	})

	it("injects the local key when the Memory tab sends none", () => {
		assert.equal(pickAuthorization(undefined, "sm_local"), "Bearer sm_local")
		assert.equal(pickAuthorization("  ", "sm_local"), "Bearer sm_local")
	})

	it("does not invent a header without a key", () => {
		assert.equal(pickAuthorization(undefined, ""), null)
	})
})

describe("parseListen / parseArgs", () => {
	it("parses host:port", () => {
		assert.deepEqual(parseListen("0.0.0.0:6768"), { host: "0.0.0.0", port: 6768 })
	})

	it("reads CLI flags", () => {
		assert.deepEqual(
			parseArgs(["--target", "http://127.0.0.1:9", "--listen", "127.0.0.1:9"]),
			{
				target: "http://127.0.0.1:9",
				listen: "127.0.0.1:9",
				dataDir: process.env.SUPERMEMORY_DATA_DIR,
				apiKey: process.env.SUPERMEMORY_API_KEY,
			},
		)
	})
})

describe("createLanDashboardProxy", () => {
	it("injects Authorization for unauthenticated Memory-tab requests", async () => {
		let seenAuth
		const upstream = http.createServer((req, res) => {
			seenAuth = req.headers.authorization
			res.writeHead(200, { "content-type": "application/json" })
			res.end(JSON.stringify({ documents: [], via: req.url }))
		})
		await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve))
		const upstreamPort = upstream.address().port

		const proxy = createLanDashboardProxy({
			target: `http://127.0.0.1:${upstreamPort}`,
			apiKey: "sm_test_key",
		})
		await new Promise((resolve) => proxy.listen(0, "127.0.0.1", resolve))
		const proxyPort = proxy.address().port

		const res = await fetch(
			`http://127.0.0.1:${proxyPort}/v3/documents/documents`,
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ page: 1 }),
			},
		)
		assert.equal(res.status, 200)
		assert.equal(seenAuth, "Bearer sm_test_key")
		assert.deepEqual(await res.json(), {
			documents: [],
			via: "/v3/documents/documents",
		})

		proxy.close()
		upstream.close()
	})
})
