import {
	CLIENT_INFO_META_KEY,
	McpServer,
	type ServerContext,
} from "@modelcontextprotocol/server"
import { instrumentPosthogMcp, type WaitUntil } from "./analytics"
import { fetchSession } from "./auth"
import { DEFAULT_NAMESPACE, SupermemoryClient } from "./client"
import { registerContextPrompt } from "./prompts/context"
import { registerNamespacesResource } from "./resources/namespaces"
import { registerProfileResource } from "./resources/profile"
import { registerWidgetResource } from "./resources/widget"
import { registerAllTools } from "./tools"
import { errorResult } from "./tools/types"
import type { ActorContext, ServerEnv } from "./types"
import {
	resolveNamespace as resolveSpaceNamespace,
	spaceStateName,
} from "./space"
import { uploadStateName } from "./space-state"

const DEFAULT_API_URL = "https://api.supermemory.ai"
const UPLOAD_SESSION_TTL_MS = 2 * 60 * 1000
const SERVER_INSTRUCTIONS =
	"Supermemory is the authenticated user's persistent memory and knowledge layer across conversations and spaces. Use these tools whenever the user wants to recall something they may have saved, inspect stored sources or extracted memories, remember or upload new information, check their Supermemory account or access, change their active space, or explore their memory graph, even if they do not mention Supermemory by name. Use the active or account-default space when none is named. Resolve a named space with list_spaces and pass its key to the relevant tool; change the active space only when the user explicitly asks."

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
	instrumentPosthogMcp(server, env, actor, waitUntil)
	const apiUrl = env.API_URL || DEFAULT_API_URL
	const spaceState = env.SPACE_STATE.getByName(spaceStateName(actor))

	const getClient = (namespace?: string) =>
		new SupermemoryClient(actor.bearerToken, namespace, apiUrl)
	const getActiveNamespace = () => spaceState.getActiveNamespace()
	const setActiveNamespace = (namespace: string) =>
		spaceState.setActiveNamespace(namespace)
	const resolveSelectedNamespace = (explicit?: string) =>
		resolveSpaceNamespace(explicit, getActiveNamespace)
	const resolveNamespace = async (explicit?: string) =>
		(await resolveSelectedNamespace(explicit)) ?? DEFAULT_NAMESPACE
	const createUploadSession = async (namespace: string) => {
		const uploadId = crypto.randomUUID()
		const uploadToken = [crypto.randomUUID(), crypto.randomUUID()]
			.join("")
			.replaceAll("-", "")
		const expiresAt = Date.now() + UPLOAD_SESSION_TTL_MS
		const uploadState = env.SPACE_STATE.getByName(uploadStateName(uploadId))
		await uploadState.createUploadSession(uploadToken, {
			bearerToken: actor.bearerToken,
			namespace,
			expiresAt,
		})
		return {
			uploadUrl: new URL(`/upload/${uploadId}`, mcpOrigin).toString(),
			uploadToken,
			expiresAt,
		}
	}
	registerAllTools({
		server,
		actor,
		getClient,
		getSession: () => fetchSession(actor.bearerToken, apiUrl),
		resolveNamespace,
		getActiveNamespace,
		setActiveNamespace,
		createUploadSession,
		getClientInfo: clientInfoFromContext,
		errorResult,
	})

	// Clients that cached the pre-v5 tool list refetch it on this notice
	server.server.oninitialized = () => {
		try {
			server.sendToolListChanged()
		} catch {}
	}

	registerProfileResource(server, getClient, resolveSelectedNamespace)
	registerNamespacesResource(
		server,
		() => getClient(),
		resolveSelectedNamespace,
	)
	registerWidgetResource(server, mcpOrigin)
	registerContextPrompt(server, getClient, resolveSelectedNamespace)

	return server
}
