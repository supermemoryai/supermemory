// Test-only wrangler entry point used by rate-limiter.integration.test.ts.
// It re-exports the production Worker app and Durable Object classes, and adds
// an internal route that calls the RateLimiter Durable Object directly so the
// integration test can exercise `stub.check(options)` over Cloudflare RPC
// without relying on the MCP handler or authentication.
import app from "./index"
import { rateLimiterName } from "./rate-limiter"

app.get("/__test/rate-limit", async (c) => {
	const options = {
		limit: Number.parseInt(c.req.query("limit") || "1", 10),
		windowMs: Number.parseInt(c.req.query("windowMs") || "60000", 10),
	}
	const key = c.req.query("key") || "direct_rl_test"
	const name = await rateLimiterName(key)
	const stub = c.env.RATE_LIMITER.getByName(name)
	const result = await stub.check(options)
	return c.json(result)
})

export * from "./index"
export default app
