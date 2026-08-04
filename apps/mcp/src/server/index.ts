import type { AuthInfo } from "@modelcontextprotocol/server"
import { createMcpHandler } from "agents/mcp/server"
import { Hono, type Context } from "hono"
import { cors } from "hono/cors"
import { validateOAuthToken, type AuthUser } from "./auth"
import { SupermemoryMCP } from "./legacy-protocol-state"
import { createSupermemoryServer } from "./server"
import type { ActorContext, ServerEnv } from "./types"
import { SpaceState, uploadStateName } from "./space-state"

type Bindings = ServerEnv

const app = new Hono<{ Bindings: Bindings }>()

const DEFAULT_API_URL = "https://api.supermemory.ai"
const DEFAULT_MCP_RESOURCE = "https://mcp.supermemory.ai/mcp"
const PROTECTED_RESOURCE_METADATA_PATH =
	"/.well-known/oauth-protected-resource/mcp"
const UPLOAD_ID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
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

app.get("/.well-known/openai-apps-challenge", (c) => {
	return c.text(c.env.OPENAI_APPS_CHALLENGE || "")
})

app.get("/.well-known/oauth-authorization-server", async (c) => {
	const apiUrl = c.env.API_URL || DEFAULT_API_URL

	try {
		const response = await fetch(
			`${apiUrl}/.well-known/oauth-authorization-server`,
		)
		if (!response.ok) {
			return Response.json(
				{ error: "Failed to fetch authorization server metadata" },
				{ status: response.status },
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
	const mcpOrigin = c.env.MCP_PUBLIC_ORIGIN || new URL(mcpResource).origin

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
		() =>
			createSupermemoryServer(
				c.env,
				actor,
				(promise) => c.executionCtx.waitUntil(promise),
				mcpOrigin,
			),
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

app.post("/upload/:uploadId", async (c) => {
	const uploadId = c.req.param("uploadId")
	const contentType = c.req.header("Content-Type")
	const authHeader = c.req.header("Authorization")
	const uploadToken = authHeader?.replace(/^Bearer\s+/i, "").trim()

	if (!UPLOAD_ID_PATTERN.test(uploadId) || !uploadToken) {
		return c.json({ error: "Invalid or expired upload session" }, 401)
	}
	if (!contentType?.toLowerCase().startsWith("multipart/form-data;")) {
		return c.json({ error: "Expected multipart form data" }, 415)
	}
	if (!c.req.raw.body) {
		return c.json({ error: "File upload body is required" }, 400)
	}

	const uploadState = c.env.SPACE_STATE.getByName(uploadStateName(uploadId))
	const session = await uploadState.consumeUploadSession(uploadToken)
	if (!session) {
		return c.json({ error: "Invalid or expired upload session" }, 401)
	}

	const apiUrl = (c.env.API_URL || DEFAULT_API_URL).replace(/\/+$/, "")
	try {
		const response = await fetch(`${apiUrl}/v3/documents/file`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${session.bearerToken}`,
				"Content-Type": contentType,
				"x-sm-source": "supermemory-mcp",
			},
			body: c.req.raw.body,
			signal: c.req.raw.signal,
		})
		const headers = new Headers({ "Cache-Control": "no-store" })
		const responseContentType = response.headers.get("Content-Type")
		const retryAfter = response.headers.get("Retry-After")
		if (responseContentType) headers.set("Content-Type", responseContentType)
		if (retryAfter) headers.set("Retry-After", retryAfter)

		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		})
	} catch {
		return c.json({ error: "File upload failed" }, 502)
	}
})

app.all("/", (c) => handleMcpRequest(c, "/mcp"))
app.all("/mcp", (c) => handleMcpRequest(c))
app.all("/mcp/", (c) => handleMcpRequest(c, "/mcp"))

export { SpaceState, SupermemoryMCP }
export type { ActorContext, ServerEnv }

export default app
