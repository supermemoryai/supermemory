import type { AuthInfo } from "@modelcontextprotocol/server"
import { createMcpHandler } from "agents/mcp/server"
import { Hono, type Context } from "hono"
import { cors } from "hono/cors"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { validateOAuthToken, type AuthUser } from "./auth"
import { SupermemoryMCP } from "./legacy-protocol-state"
import { createSupermemoryServer } from "./server"
import type { ActorContext, ServerEnv } from "./types"
import { WorkspaceState } from "./workspace-state"

type Bindings = ServerEnv

const app = new Hono<{ Bindings: Bindings }>()

const DEFAULT_API_URL = "https://api.supermemory.ai"
const DEFAULT_MCP_RESOURCE = "https://mcp.supermemory.ai/mcp"
const PROTECTED_RESOURCE_METADATA_PATH =
	"/.well-known/oauth-protected-resource/mcp"
const DEFAULT_ALLOWED_ORIGIN_HOSTNAMES = [
	"app.supermemory.ai",
	"mcp.supermemory.ai",
	"mcp.dev.supermemory.ai",
	"mcp.dev.supermemory",
	"claude.ai",
	"chatgpt.com",
	"chat.openai.com",
	"gemini.google.com",
	"grok.com",
	"x.ai",
	"t3.chat",
	"localhost",
	"127.0.0.1",
	"[::1]",
]

app.use(
	"*",
	cors({
		origin: "*",
		allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
		// When omitted, Hono echoes Access-Control-Request-Headers. This keeps
		// modern Mcp-Method/Mcp-Name/Mcp-Param-* routing forward-compatible.
		exposeHeaders: ["WWW-Authenticate"],
	}),
)

app.get("/", (c) => {
	return c.json({
		name: "supermemory-mcp",
		version: "1.0.0",
		description: "Supermemory MCP - AI memory for teams",
		docs: "https://supermemory.ai/docs/supermemory-mcp/mcp",
	})
})

function resourceMetadata(c: Context<{ Bindings: Bindings }>) {
	const apiUrl = c.env.API_URL || DEFAULT_API_URL
	const mcpResource = c.env.MCP_RESOURCE || DEFAULT_MCP_RESOURCE

	return c.json({
		resource: mcpResource,
		authorization_servers: [`${apiUrl.replace(/\/+$/, "")}/api/auth`],
		scopes_supported: ["openid", "profile", "email", "offline_access"],
		bearer_methods_supported: ["header"],
		resource_documentation: "https://supermemory.ai/docs/supermemory-mcp/mcp",
	})
}

app.get("/.well-known/oauth-protected-resource", resourceMetadata)
app.get(PROTECTED_RESOURCE_METADATA_PATH, resourceMetadata)

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
		return c.json(await response.json())
	} catch (error) {
		console.error("Error fetching OAuth metadata:", error)
		return c.json({ error: "Internal server error" }, 500)
	}
})

function allowedOriginHostnames(env: Bindings): string[] {
	const configured =
		env.ALLOWED_MCP_ORIGIN_HOSTNAMES?.split(",")
			.map((hostname) => hostname.trim().toLowerCase())
			.filter(Boolean) ?? []

	return [...new Set([...DEFAULT_ALLOWED_ORIGIN_HOSTNAMES, ...configured])]
}

function authInfoFor(
	authUser: AuthUser,
	resource: string,
): AuthInfo | undefined {
	if (!authUser.oauthClientId) return undefined

	return {
		token: authUser.bearerToken,
		clientId: authUser.oauthClientId,
		scopes: authUser.scopes,
		expiresAt: authUser.expiresAt,
		resource: new URL(resource),
		extra: {
			userId: authUser.userId,
			organizationId: authUser.organizationId,
		},
	}
}

function unauthorizedResponse(
	resourceMetadataUrl: string,
	invalidToken = false,
): Response {
	if (!invalidToken) {
		return new Response("Unauthorized", {
			status: 401,
			headers: {
				"WWW-Authenticate": `Bearer resource_metadata="${resourceMetadataUrl}"`,
				"Access-Control-Expose-Headers": "WWW-Authenticate",
				"Access-Control-Allow-Origin": "*",
			},
		})
	}

	return Response.json(
		{
			jsonrpc: "2.0",
			error: {
				code: -32000,
				message: "Invalid or expired token",
			},
			id: null,
		},
		{
			status: 401,
			headers: {
				"WWW-Authenticate": `Bearer error="invalid_token", resource_metadata="${resourceMetadataUrl}"`,
				"Access-Control-Expose-Headers": "WWW-Authenticate",
				"Access-Control-Allow-Origin": "*",
			},
		},
	)
}

async function handleMcpRequest(
	c: Context<{ Bindings: Bindings }>,
	rewritePath?: string,
) {
	const authHeader = c.req.header("Authorization")
	const token = authHeader?.replace(/^Bearer\s+/i, "").trim()
	const apiUrl = c.env.API_URL || DEFAULT_API_URL
	const mcpResource = c.env.MCP_RESOURCE || DEFAULT_MCP_RESOURCE

	const reqHost = c.req.header("x-forwarded-host") || c.req.header("host") || ""
	const reqProto = c.req.header("x-forwarded-proto") || "https"
	const resourceMetadataUrl = reqHost
		? `${reqProto}://${reqHost}${PROTECTED_RESOURCE_METADATA_PATH}`
		: PROTECTED_RESOURCE_METADATA_PATH

	if (!token) return unauthorizedResponse(resourceMetadataUrl)

	const authUser = await validateOAuthToken(token, apiUrl, mcpResource)
	if (!authUser) return unauthorizedResponse(resourceMetadataUrl, true)

	const actor: ActorContext = {
		userId: authUser.userId,
		organizationId: authUser.organizationId,
		bearerToken: authUser.bearerToken,
		oauthClientId: authUser.oauthClientId,
	}
	const request = rewritePath
		? new Request(new URL(rewritePath, c.req.url).toString(), c.req.raw)
		: c.req.raw
	const handler = createMcpHandler(
		() => createSupermemoryServer(c.env, actor),
		{
			route: "/mcp",
			legacy: "stateless",
			corsOptions: false,
			allowedOriginHostnames: allowedOriginHostnames(c.env),
			onerror: (error) => console.error("MCP request error:", error),
		},
	)

	return handler.fetch(request, {
		authInfo: authInfoFor(authUser, mcpResource),
	})
}

app.all("/", (c) => handleMcpRequest(c, "/mcp"))
app.all("/mcp", (c) => handleMcpRequest(c))
app.all("/mcp/", (c) => handleMcpRequest(c, "/mcp"))

export { SupermemoryMCP, WorkspaceState }
export type { ActorContext, ServerEnv }

export default app
