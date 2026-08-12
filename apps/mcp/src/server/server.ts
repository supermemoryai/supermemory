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
import { DEFAULT_PROJECT_ID, SupermemoryClient } from "./client"
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
import { uploadStateName } from "./space-state"

const DEFAULT_API_URL = "https://api.supermemory.ai"
const UPLOAD_SESSION_TTL_MS = 2 * 60 * 1000
const SERVER_INSTRUCTIONS =
	"Supermemory is the authenticated user's persistent memory and knowledge layer across conversations and spaces. Use these tools whenever the user wants to recall something they may have saved, inspect stored sources or extracted memories, remember or upload new information, check their Supermemory account or access, change their active space, or explore their memory graph, even if they do not mention Supermemory by name. Use the active or account-default space when none is named. Resolve a named space with listSpaces and pass its key to the relevant tool; change the active space only when the user explicitly asks."

type ClientInfo = { name: string; version?: string }

function clientInfoFromContext(context: ServerContext): ClientInfo | null {
	const envelope = context.mcpReq.envelope
	if (!envelope) return null
	const value = Reflect.get(envelope, CLIENT_INFO_META_KEY)
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
	mcpOrigin: string,
): McpServer {
	const server = new McpServer(
		{
			name: "supermemory",
			version: "1.0.0",
		},
		{ instructions: SERVER_INSTRUCTIONS },
	)
	const apiUrl = env.API_URL || DEFAULT_API_URL
	const spaceState = env.SPACE_STATE.getByName(spaceStateName(actor))

	const getClient = (containerTag?: string) =>
		new SupermemoryClient(actor.bearerToken, containerTag, apiUrl)
	const getActiveContainerTag = () => spaceState.getActiveContainerTag()
	const setActiveContainerTag = (containerTag: string) =>
		spaceState.setActiveContainerTag(containerTag)
	const resolveSelectedContainerTag = (explicit?: string) =>
		resolveSpaceContainerTag(explicit, getActiveContainerTag)
	const resolveContainerTag = async (explicit?: string) =>
		(await resolveSelectedContainerTag(explicit)) ?? DEFAULT_PROJECT_ID
	const createUploadSession = async () => {
		const uploadId = crypto.randomUUID()
		const uploadToken = [crypto.randomUUID(), crypto.randomUUID()]
			.join("")
			.replaceAll("-", "")
		const expiresAt = Date.now() + UPLOAD_SESSION_TTL_MS
		const uploadState = env.SPACE_STATE.getByName(uploadStateName(uploadId))
		await uploadState.createUploadSession(uploadToken, {
			bearerToken: actor.bearerToken,
			expiresAt,
		})
		return {
			uploadUrl: new URL(`/upload/${uploadId}`, mcpOrigin).toString(),
			uploadToken,
			expiresAt,
		}
	}
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
		createUploadSession,
		getClientInfo: clientInfoFromContext,
		errorResult,
	})

	registerProfileResource(server, getClient, resolveSelectedContainerTag)
	registerContainerTagsResource(
		server,
		() => getClient(),
		resolveSelectedContainerTag,
	)
	registerWidgetResource(server, mcpOrigin)
	registerContextPrompt(server, getClient, resolveSelectedContainerTag)

	return server
}
