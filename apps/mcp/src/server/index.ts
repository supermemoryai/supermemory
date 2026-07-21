import { Hono, type Context } from "hono"
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

type Bindings = {
	MCP_SERVER: DurableObjectNamespace
	API_URL?: string
	MCP_RESOURCE?: string
}

async function resolveAuth(
	token: string,
	apiUrl: string,
	mcpResource: string,
): Promise<AuthUser | null> {
	return isApiKey(token)
		? await validateApiKey(token, apiUrl)
		: await validateOAuthToken(token, apiUrl, mcpResource)
}

export type { Props }

const app = new Hono<{ Bindings: Bindings }>()

const DEFAULT_API_URL = "https://api.supermemory.ai"
const DEFAULT_MCP_RESOURCE = "https://mcp.supermemory.ai/mcp"
const PROTECTED_RESOURCE_METADATA_PATH =
	"/.well-known/oauth-protected-resource/mcp"

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

// OAuth discovery: resource metadata. The protected resource is the MCP
// endpoint itself, so path-aware clients discover metadata at the well-known
// URL with `/mcp` appended.
function resourceMetadata(c: Context<{ Bindings: Bindings }>) {
	const apiUrl = c.env.API_URL || DEFAULT_API_URL
	const mcpResource = c.env.MCP_RESOURCE || DEFAULT_MCP_RESOURCE

	return c.json({
		resource: mcpResource,
		authorization_servers: [apiUrl],
		scopes_supported: ["openid", "profile", "email", "offline_access"],
		bearer_methods_supported: ["header"],
		resource_documentation: "https://docs.supermemory.ai/mcp",
	})
}

app.get("/.well-known/oauth-protected-resource", resourceMetadata)
app.get(PROTECTED_RESOURCE_METADATA_PATH, resourceMetadata)

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

async function handleMcpRequest(
	c: Context<{ Bindings: Bindings }>,
	rewritePath?: string,
) {
	const authHeader = c.req.header("Authorization")
	const token = authHeader?.replace(/^Bearer\s+/i, "")
	const containerTag = c.req.header("x-sm-project")
	const apiUrl = c.env.API_URL || DEFAULT_API_URL
	const mcpResource = c.env.MCP_RESOURCE || DEFAULT_MCP_RESOURCE

	// Build absolute resource_metadata URL from incoming request (works
	// behind tunnels where the scheme/host differ from localhost)
	const reqHost = c.req.header("x-forwarded-host") || c.req.header("host") || ""
	const reqProto = c.req.header("x-forwarded-proto") || "https"
	const resourceMetadataUrl = reqHost
		? `${reqProto}://${reqHost}${PROTECTED_RESOURCE_METADATA_PATH}`
		: PROTECTED_RESOURCE_METADATA_PATH

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

	const authUser = await resolveAuth(token, apiUrl, mcpResource)

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
			bearerToken: authUser.bearerToken,
			containerTag,
		} satisfies Props,
	} as ExecutionContext & { props: Props }

	const request = rewritePath
		? new Request(new URL(rewritePath, c.req.url).toString(), c.req.raw)
		: c.req.raw

	return mcpHandler.fetch(request, c.env, ctx)
}

app.all("/", async (c) => {
	return handleMcpRequest(c, "/mcp")
})

app.all("/mcp/*", async (c) => {
	return handleMcpRequest(c)
})

export { SupermemoryMCP }

export default app
