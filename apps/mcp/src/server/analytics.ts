import type { McpServer } from "@modelcontextprotocol/server"
import { instrument, type MCPAnalyticsOptions } from "@posthog/mcp"
import { PostHog } from "posthog-node"
import type { ActorContext, ServerEnv } from "./types"

const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com"
const PERSONLESS_DISTINCT_ID_NAMESPACE = "supermemory-posthog-personless-v1"
const MCP_EVENT_PROPERTIES = [
	"$mcp_source",
	"$mcp_server_name",
	"$mcp_server_version",
	"$mcp_tool_name",
	"$mcp_duration_ms",
	"$mcp_is_error",
	"$mcp_client_name",
	"$mcp_client_version",
	"$mcp_protocol_version",
	"$mcp_listed_tool_names",
	"$mcp_conversation_id",
	"$session_id",
	"$groups",
] as const

export type WaitUntil = (promise: Promise<unknown>) => void

// Must match the API's personless id hashing so MCP and API events share one id.
async function personlessDistinctId(userId: string): Promise<string> {
	const input = new TextEncoder().encode(
		`${PERSONLESS_DISTINCT_ID_NAMESPACE}:${userId}`,
	)
	const digest = await crypto.subtle.digest("SHA-256", input)
	const hash = Array.from(new Uint8Array(digest), (byte) =>
		byte.toString(16).padStart(2, "0"),
	).join("")
	return `personless_${hash}`
}

class ImmediateMcpPostHog extends PostHog {
	constructor(
		apiKey: string,
		host: string,
		private readonly waitUntil: WaitUntil,
	) {
		super(apiKey, { host })
	}

	override capture(event: Parameters<PostHog["capture"]>[0]): void {
		try {
			this.waitUntil(
				this.captureImmediate(event).catch((error) =>
					console.error("PostHog MCP tracking error:", error),
				),
			)
		} catch (error) {
			console.error("PostHog MCP tracking error:", error)
		}
	}
}

const metadataOnlyMcpEvent: NonNullable<MCPAnalyticsOptions["beforeSend"]> = (
	event,
) => {
	if (
		!["$mcp_tool_call", "$mcp_tools_list", "$mcp_initialize"].includes(
			event.event,
		)
	) {
		return null
	}

	return {
		...event,
		properties: {
			...Object.fromEntries(
				MCP_EVENT_PROPERTIES.filter(
					(key) => event.properties[key] !== undefined,
				).map((key) => [key, event.properties[key]]),
			),
			$process_person_profile: false,
		},
	}
}

// Stateless HTTP builds a server per request, so only the echoed conversation id groups calls.
export function instrumentPosthogMcp(
	server: McpServer,
	env: ServerEnv,
	actor: ActorContext,
	waitUntil: WaitUntil,
): void {
	if (!env.POSTHOG_API_KEY) return

	instrument(
		server,
		new ImmediateMcpPostHog(
			env.POSTHOG_API_KEY,
			env.POSTHOG_HOST || DEFAULT_POSTHOG_HOST,
			waitUntil,
		),
		{
			identify: async () => ({
				distinctId: await personlessDistinctId(actor.userId),
				groups: { company: actor.organizationId },
			}),
			context: false,
			captureModel: false,
			enableConversationId: true,
			enableExceptionAutocapture: false,
			beforeSend: metadataOnlyMcpEvent,
		},
	)
}
