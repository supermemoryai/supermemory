import { cors } from "hono/cors"
import { Hono } from "hono"
import { SupermemoryMCP } from "./server"
import { isApiKey, validateApiKey, validateOAuthToken } from "./auth"
import { initPosthog } from "./posthog"
import type { ContentfulStatusCode } from "hono/utils/http-status"

type Bindings = {
	MCP_SERVER: DurableObjectNamespace
	API_URL?: string
	POSTHOG_API_KEY?: string
}

type Props = {
	userId: string
	apiKey: string
	containerTag?: string
	email?: string
	name?: string
}

const app = new Hono<{ Bindings: Bindings }>()

const DEFAULT_API_URL = "https://api.supermemory.ai"

// CORS
app.use(
	"*",
	cors({
		origin: "*",
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "x-sm-project"],
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
app.get("/.well-known/oauth-protected-resource", (c) => {
	const apiUrl = c.env.API_URL || DEFAULT_API_URL
	const resourceUrl =
		c.env.API_URL === "http://localhost:8787"
			? "http://localhost:8788"
			: "https://mcp.supermemory.ai"

	return c.json({
		resource: resourceUrl,
		authorization_servers: [apiUrl],
		scopes_supported: ["openid", "profile", "email", "offline_access"],
		bearer_methods_supported: ["header"],
		resource_documentation: "https://docs.supermemory.ai/mcp",
	})
})

// Proxy endpoint for MCP clients that don't follow the spec correctly
// Some clients look for oauth-authorization-server on the MCP server domain
// instead of following the authorization_servers array
app.get("/.well-known/oauth-authorization-server", async (c) => {
	const apiUrl = c.env.API_URL || DEFAULT_API_URL

	try {
		// Fetch the authorization server metadata from the main API
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
		console.error("Error fetching OAuth authorization server metadata:", error)
		return c.json({ error: "Internal server error" }, 500)
	}
})

const mcpHandler = SupermemoryMCP.mount("/mcp", {
	binding: "MCP_SERVER",
	corsOptions: {
		origin: "*",
		methods: "GET, POST, OPTIONS",
		headers: "Content-Type, Authorization, x-sm-project",
	},
})

app.all("/mcp/*", async (c) => {
	const authHeader = c.req.header("Authorization")
	const token = authHeader?.replace(/^Bearer\s+/i, "")
	const containerTag = c.req.header("x-sm-project")
	const apiUrl = c.env.API_URL || DEFAULT_API_URL

	if (!token) {
		return new Response("Unauthorized", {
			status: 401,
			headers: {
				"WWW-Authenticate": `Bearer resource_metadata="/.well-known/oauth-protected-resource"`,
				"Access-Control-Expose-Headers": "WWW-Authenticate",
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
					"WWW-Authenticate": `Bearer error="invalid_token", resource_metadata="/.well-known/oauth-protected-resource"`,
					"Access-Control-Expose-Headers": "WWW-Authenticate",
				},
			},
		)
	}

	// Create execution context with authenticated user props
	const ctx = {
		...c.executionCtx,
		props: {
			userId: authUser.userId,
			apiKey: authUser.apiKey,
			containerTag,
			email: authUser.email,
			name: authUser.name,
		} satisfies Props,
	} as ExecutionContext & { props: Props }

	return mcpHandler.fetch(c.req.raw, c.env, ctx)
})

// Export the Durable Object class for Cloudflare Workers
export { SupermemoryMCP }

export default app
