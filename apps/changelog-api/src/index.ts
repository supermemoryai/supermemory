import { Hono } from "hono"
import { cors } from "hono/cors"
import { parseChangelog, type ChangelogResponse } from "./parser"

const MDX_URL =
	"https://raw.githubusercontent.com/supermemoryai/supermemory/main/apps/docs/changelog/developer-platform.mdx"

const CACHE_KEY = "changelog-api-v1"
const CACHE_TTL_SECONDS = 3600 // 1 hour

const app = new Hono()

app.use(
	"*",
	cors({
		origin: "*",
		allowMethods: ["GET", "OPTIONS"],
		allowHeaders: ["Content-Type"],
	}),
)

async function fetchAndParseChangelog(): Promise<ChangelogResponse> {
	const response = await fetch(MDX_URL)
	if (!response.ok) {
		throw new Error(`Failed to fetch changelog: ${response.status}`)
	}
	const content = await response.text()
	return parseChangelog(content)
}

async function getCachedChangelog(
	cacheUrl: string,
): Promise<ChangelogResponse | null> {
	const cache = caches.default
	const cachedResponse = await cache.match(cacheUrl)

	if (cachedResponse) {
		return cachedResponse.json()
	}

	return null
}

async function cacheChangelog(
	cacheUrl: string,
	data: ChangelogResponse,
): Promise<void> {
	const cache = caches.default
	const response = new Response(JSON.stringify(data), {
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
		},
	})
	await cache.put(cacheUrl, response)
}

app.get("/", async (c) => {
	const cacheUrl = new URL(CACHE_KEY, c.req.url).toString()

	// Try to get from cache first
	let changelog = await getCachedChangelog(cacheUrl)

	if (!changelog) {
		// Fetch fresh data
		changelog = await fetchAndParseChangelog()
		// Cache it (don't await to not block response)
		c.executionCtx.waitUntil(cacheChangelog(cacheUrl, changelog))
	}

	return c.json(changelog, {
		headers: {
			"Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}, s-maxage=86400`,
		},
	})
})

// Health check endpoint
app.get("/health", (c) => {
	return c.json({ status: "ok" })
})

export default app
