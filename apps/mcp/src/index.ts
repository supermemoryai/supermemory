import { createMcpHandler } from "@modelcontextprotocol/server"
import { cors } from "hono/cors"
import { Hono, type Context } from "hono"
import { isApiKey, validateApiKey, validateOAuthToken } from "./auth"
import { createServer, type AuthProps, type McpEnv } from "./server"
import { initPosthog } from "./posthog"
import type { ContentfulStatusCode } from "hono/utils/http-status"

type Bindings = McpEnv & {
	MCP_URL?: string
}

const app = new Hono<{ Bindings: Bindings }>()

const DEFAULT_API_URL = "https://api.supermemory.ai"
const DEFAULT_MCP_URL = "https://mcp.supermemory.ai"

const mcpBaseUrl = (c: Context<{ Bindings: Bindings }>) => {
	if (c.env.MCP_URL) return c.env.MCP_URL.replace(/\/$/, "")
	const host = c.req.header("x-forwarded-host") || c.req.header("host")
	const proto = c.req.header("x-forwarded-proto") || "https"
	return host ? `${proto}://${host}` : DEFAULT_MCP_URL
}

// CORS
app.use(
	"*",
	cors({
		origin: "*",
		allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
		// Echo Access-Control-Request-Headers so modern Mcp-Method, Mcp-Name,
		// and dynamic Mcp-Param-* routing headers remain forward-compatible.
		exposeHeaders: ["Mcp-Session-Id", "WWW-Authenticate"],
	}),
)

app.use("*", async (c, next) => {
	initPosthog(c.env.POSTHOG_API_KEY)
	await next()
})

app.get("/", (c) => {
	return c.json({
		name: "supermemory-mcp",
		version: "4.0.0",
		description: "Give your AI a memory",
		docs: "https://docs.supermemory.ai/mcp",
	})
})

// MCP clients use this to discover the authorization server
const protectedResourceHandler = (c: Context<{ Bindings: Bindings }>) => {
	const apiUrl = c.env.API_URL || DEFAULT_API_URL
	return c.json({
		resource: `${mcpBaseUrl(c)}/mcp`,
		authorization_servers: [apiUrl],
		scopes_supported: ["openid", "profile", "email", "offline_access"],
		bearer_methods_supported: ["header"],
		resource_documentation: "https://docs.supermemory.ai/mcp",
	})
}
app.get("/.well-known/oauth-protected-resource", protectedResourceHandler)
app.get("/.well-known/oauth-protected-resource/mcp", protectedResourceHandler)

// Proxy endpoint for MCP clients that don't follow the spec correctly
// Some clients look for oauth-authorization-server on the MCP server domain
// instead of following the authorization_servers array
app.get("/.well-known/oauth-authorization-server", async (c) => {
	const apiUrl = c.env.API_URL || DEFAULT_API_URL

	try {
		// Fetch the authorization server metadata from the main API
		const response = await fetch(
			`${apiUrl}/.well-known/oauth-authorization-server`,
			{ signal: AbortSignal.timeout(30_000) },
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
		console.error("Error fetching OAuth authorization server metadata:", error)
		return c.json({ error: "Internal server error" }, 500)
	}
})

function authenticatedMcpHandler(env: Bindings, props: AuthProps) {
	return createMcpHandler(() => createServer(env, props))
}

export const handleMcpRequest = async (c: Context<{ Bindings: Bindings }>) => {
	const authHeader = c.req.header("Authorization")
	const token = authHeader?.replace(/^Bearer\s+/i, "")
	const containerTag = c.req.header("x-sm-project")
	const apiUrl = c.env.API_URL || DEFAULT_API_URL

	const resourceMetadataUrl = `${mcpBaseUrl(c)}/.well-known/oauth-protected-resource/mcp`

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

	let authUser: {
		userId: string
		apiKey: string
		email?: string
		name?: string
	} | null = null

	if (isApiKey(token)) {
		console.log("Authenticating with API key")
		authUser = await validateApiKey(token, apiUrl)
	} else {
		console.log("Authenticating with OAuth token")
		authUser = await validateOAuthToken(token, apiUrl)
	}

	if (!authUser) {
		const errorMessage = isApiKey(token)
			? "Unauthorized: Invalid or expired API key"
			: "Unauthorized: Invalid or expired token"

		return new Response(
			JSON.stringify({
				jsonrpc: "2.0",
				error: {
					code: -32000,
					message: errorMessage,
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

	const props = {
		userId: authUser.userId,
		apiKey: authUser.apiKey,
		containerTag,
		email: authUser.email,
		name: authUser.name,
	} satisfies AuthProps

	return authenticatedMcpHandler(c.env, props).fetch(c.req.raw)
}

app.all("/mcp", handleMcpRequest)

export default app
