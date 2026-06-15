import { Hono } from "hono"
import { cors } from "hono/cors"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { Props } from "../shared/types"
import { SupermemoryMCP } from "./agent"
import {
	type AuthUser,
	isApiKey,
	validateApiKey,
	validateOAuthToken,
} from "./auth"
import { getCachedAuth, putCachedAuth } from "./auth/cache"

type Bindings = {
	MCP_SERVER: DurableObjectNamespace
	API_URL?: string
	AUTH_CACHE?: KVNamespace
}

// Per-request validation, but cached against an introspected result keyed
// by SHA-256(token). Hot path: ~5ms KV lookup. Cold path: ~400ms upstream
// introspection (same as today). TTL 5 min — matches Better Auth's cookie
// cache. Fail-open if KV is unavailable so we never hard-fail auth.
async function resolveAuth(
	token: string,
	apiUrl: string,
	kv: KVNamespace | undefined,
): Promise<AuthUser | null> {
	if (kv) {
		try {
			const cached = await getCachedAuth(kv, token)
			if (cached) {
				console.log("[auth] cache-hit")
				return cached
			}
		} catch (err) {
			console.warn("[auth] cache-error:", err)
		}
	}

	console.log("[auth] cache-miss")
	const user = isApiKey(token)
		? await validateApiKey(token, apiUrl)
		: await validateOAuthToken(token, apiUrl)

	if (user && kv) {
		// Best-effort write; never block the request on cache write
		void putCachedAuth(kv, token, user).catch((err) =>
			console.warn("[auth] cache-write-error:", err),
		)
	}
	return user
}

export type { Props }

const app = new Hono<{ Bindings: Bindings }>()

const DEFAULT_API_URL = "https://api.supermemory.ai"

app.use(
	"*",
	cors({
		origin: "*",
		allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
		allowHeaders: [
			"Content-Type",
			"Authorization",
			"x-sm-project",
			"Accept",
			"Mcp-Session-Id",
			"MCP-Protocol-Version",
			"Last-Event-ID",
		],
		exposeHeaders: ["Mcp-Session-Id", "WWW-Authenticate"],
	}),
)

app.get("/", (c) => {
	return c.json({
		name: "supermemory-mcp",
		version: "1.0.0",
		description: "Supermemory MCP — AI memory for teams",
		docs: "https://docs.supermemory.ai/mcp",
	})
})

// OAuth discovery: resource metadata
app.get("/.well-known/oauth-protected-resource", (c) => {
	const apiUrl = c.env.API_URL || DEFAULT_API_URL
	// Derive resource URL from the incoming request so it matches whatever
	// host the client connected to (tunnel, prod, localhost, etc.)
	const host = c.req.header("x-forwarded-host") || c.req.header("host")
	const proto = c.req.header("x-forwarded-proto") || "https"
	const resourceUrl = host
		? `${proto}://${host}`
		: "https://mcp.supermemory.ai"

	return c.json({
		resource: resourceUrl,
		authorization_servers: [apiUrl],
		scopes_supported: ["openid", "profile", "email", "offline_access"],
		bearer_methods_supported: ["header"],
		resource_documentation: "https://docs.supermemory.ai/mcp",
	})
})

// OAuth discovery: proxy authorization server metadata
app.get("/.well-known/oauth-authorization-server", async (c) => {
	const apiUrl = c.env.API_URL || DEFAULT_API_URL

	try {
		const response = await fetch(
			`${apiUrl}/.well-known/oauth-authorization-server`,
		)
		if (!response.ok) {
			return c.json(
				{ error: "Failed to fetch authorization server metadata" },
				{ status: response.status as ContentfulStatusCode },
			)
		}
		const metadata = await response.json()
		return c.json(metadata)
	} catch (error) {
		console.error("Error fetching OAuth metadata:", error)
		return c.json({ error: "Internal server error" }, 500)
	}
})

const mcpHandler = SupermemoryMCP.serve("/mcp", {
	binding: "MCP_SERVER",
	corsOptions: {
		origin: "*",
		methods: "GET, POST, DELETE, OPTIONS",
		headers: "Content-Type, Authorization, x-sm-project",
	},
})

app.all("/mcp/*", async (c) => {
	const authHeader = c.req.header("Authorization")
	const token = authHeader?.replace(/^Bearer\s+/i, "")
	const containerTag = c.req.header("x-sm-project")
	const apiUrl = c.env.API_URL || DEFAULT_API_URL

	// Build absolute resource_metadata URL from incoming request (works
	// behind tunnels where the scheme/host differ from localhost)
	const reqHost = c.req.header("x-forwarded-host") || c.req.header("host") || ""
	const reqProto = c.req.header("x-forwarded-proto") || "https"
	const resourceMetadataUrl = reqHost
		? `${reqProto}://${reqHost}/.well-known/oauth-protected-resource`
		: "/.well-known/oauth-protected-resource"

	if (!token) {
		return new Response("Unauthorized", {
			status: 401,
			headers: {
				"WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
				"Access-Control-Expose-Headers": "WWW-Authenticate",
				"Access-Control-Allow-Origin": "*",
			},
		})
	}

	const authUser = await resolveAuth(token, apiUrl, c.env.AUTH_CACHE)

	if (!authUser) {
		return new Response(
			JSON.stringify({
				jsonrpc: "2.0",
				error: {
					code: -32000,
					message: isApiKey(token)
						? "Invalid or expired API key"
						: "Invalid or expired token",
				},
				id: null,
			}),
			{
				status: 401,
				headers: {
					"Content-Type": "application/json",
					"WWW-Authenticate": `Bearer error="invalid_token", resource_metadata="${resourceMetadataUrl}"`,
					"Access-Control-Expose-Headers": "WWW-Authenticate",
					"Access-Control-Allow-Origin": "*",
				},
			},
		)
	}

	const ctx = {
		...c.executionCtx,
		props: {
			userId: authUser.userId,
			apiKey: authUser.apiKey,
			containerTag,
			email: authUser.email,
			name: authUser.name,
			role: authUser.role,
			accessType: authUser.accessType,
			assignedTags: authUser.containerTags,
		} satisfies Props,
	} as ExecutionContext & { props: Props }

	return mcpHandler.fetch(c.req.raw, c.env, ctx)
})

export { SupermemoryMCP }

export default app
