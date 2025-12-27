import { Hono } from "hono"
import { cors } from "hono/cors"
import { SupermemoryMCP } from "./server"
import { validateOAuthToken } from "./auth"

type Bindings = {
	MCP_SERVER: DurableObjectNamespace
	API_URL?: string
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

app.get("/", (c) => {
	return c.json({
		name: "supermemory-mcp",
		version: "3.0.0",
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

	// Validate OAuth token via API introspection
	const oauthUser = await validateOAuthToken(token, apiUrl)

	console.log("oauthUser", JSON.stringify(oauthUser, null, 2))

	if (!oauthUser) {
		return new Response(
			JSON.stringify({
				jsonrpc: "2.0",
				error: {
					code: -32000,
					message: "Unauthorized: Invalid or expired token",
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

	// Create execution context with OAuth user props
	const ctx = {
		...c.executionCtx,
		props: {
			userId: oauthUser.userId,
			apiKey: oauthUser.apiKey,
			containerTag,
			email: oauthUser.email,
			name: oauthUser.name,
		} satisfies Props,
	} as ExecutionContext & { props: Props }

	return mcpHandler.fetch(c.req.raw, c.env, ctx)
})

// Export the Durable Object class for Cloudflare Workers
export { SupermemoryMCP }

export default app
