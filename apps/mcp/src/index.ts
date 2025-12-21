import { Hono } from "hono"
import { cors } from "hono/cors"
import { SupermemoryMCP } from "./server"

type Bindings = {
	MCP_SERVER: DurableObjectNamespace
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS
app.use(
	"*",
	cors({
		origin: "*",
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization", "x-sm-project"],
	}),
)

// Health check
app.get("/", (c) => {
	return c.json({
		name: "supermemory-mcp",
		version: "3.0.0",
		description: "Give your AI a memory",
		docs: "", // TODO: add docs
	})
})

const mcpHandler = SupermemoryMCP.mount("/sse", {
	binding: "MCP_SERVER",
	corsOptions: {
		origin: "*",
		methods: "GET, POST, OPTIONS",
		headers: "Content-Type, Authorization, x-sm-project",
	},
})

app.all("/sse/*", async (c) => {
	// Extract auth to pass as props
	const auth = c.req.header("Authorization")
	const apiKey = auth?.replace(/^Bearer\s+/i, "")
	const containerTag = c.req.header("x-sm-project")

	// Create execution context with props
	const ctx = {
		...c.executionCtx,
		props: { apiKey, containerTag },
	} as ExecutionContext & { props: { apiKey?: string; containerTag?: string } }

	return mcpHandler.fetch(c.req.raw, c.env, ctx)
})

// exporting the Durable Object class for Cloudflare Workers
export { SupermemoryMCP }

export default app
