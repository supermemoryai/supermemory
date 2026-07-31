import {
	CLIENT_INFO_META_KEY,
	McpServer,
	type ServerContext,
} from "@modelcontextprotocol/server"
import {
	createPosthogAnalytics,
	createTrackedToolServer,
	type WaitUntil,
} from "./analytics"
import { fetchSession } from "./auth"
import { SupermemoryClient } from "./client"
import { registerContextPrompt } from "./prompts/context"
import { registerContainerTagsResource } from "./resources/container-tags"
import { registerProfileResource } from "./resources/profile"
import { registerWidgetResource } from "./resources/widget"
import { registerAllTools } from "./tools"
import { errorResult } from "./tools/types"
import type { ActorContext, ServerEnv } from "./types"
import {
	resolveContainerTag as resolveSpaceContainerTag,
	spaceStateName,
} from "./space"

const DEFAULT_API_URL = "https://api.supermemory.ai"

type ClientInfo = { name: string; version?: string }

function clientInfoFromContext(context: ServerContext): ClientInfo | null {
	const envelope = context.mcpReq.envelope as
		| Record<string, unknown>
		| undefined
	const value = envelope?.[CLIENT_INFO_META_KEY]
	if (!value || typeof value !== "object") return null

	const name = Reflect.get(value, "name")
	const version = Reflect.get(value, "version")
	if (typeof name !== "string") return null

	return {
		name,
		...(typeof version === "string" ? { version } : {}),
	}
}

export function createSupermemoryServer(
	env: ServerEnv,
	actor: ActorContext,
	waitUntil: WaitUntil,
): McpServer {
	const server = new McpServer({
		name: "supermemory",
		version: "1.0.0",
	})
	const apiUrl = env.API_URL || DEFAULT_API_URL
	const spaceState = env.SPACE_STATE.getByName(spaceStateName(actor))

	const getClient = (containerTag?: string) =>
		new SupermemoryClient(actor.bearerToken, containerTag, apiUrl)
	const getActiveContainerTag = () => spaceState.getActiveContainerTag()
	const setActiveContainerTag = (containerTag: string) =>
		spaceState.setActiveContainerTag(containerTag)
	const resolveContainerTag = (explicit?: string) =>
		resolveSpaceContainerTag(explicit, getActiveContainerTag)
	const analytics = createPosthogAnalytics(env, actor, waitUntil)
	const toolServer = createTrackedToolServer(
		server,
		analytics,
		clientInfoFromContext,
	)

	registerAllTools({
		server: toolServer,
		actor,
		getClient,
		getSession: () => fetchSession(actor.bearerToken, apiUrl),
		resolveContainerTag,
		getActiveContainerTag,
		setActiveContainerTag,
		getClientInfo: clientInfoFromContext,
		errorResult,
	})

	registerProfileResource(server, getClient, resolveContainerTag)
	registerContainerTagsResource(server, () => getClient(), resolveContainerTag)
	registerWidgetResource(server)
	registerContextPrompt(server, getClient, resolveContainerTag)

	return server
}
