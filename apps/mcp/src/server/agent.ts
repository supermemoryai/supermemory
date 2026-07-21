import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { McpAgent } from "agents/mcp"
import type { Props } from "../shared/types"
import { fetchSession } from "./auth"
import { SupermemoryClient } from "./client"
import { registerContextPrompt } from "./prompts/context"
import { registerContainerTagsResource } from "./resources/container-tags"
import { registerProfileResource } from "./resources/profile"
import { registerWidgetResource } from "./resources/widget"
import { registerAllTools } from "./tools"
import { errorResult } from "./tools/types"

type Env = {
	MCP_SERVER: DurableObjectNamespace<SupermemoryMCP>
	API_URL?: string
}

const DEFAULT_API_URL = "https://api.supermemory.ai"
const ACTIVE_CONTAINER_TAG_KEY = "activeContainerTag"

export class SupermemoryMCP extends McpAgent<Env, unknown, Props> {
	private clientInfo: { name: string; version?: string } | null = null

	// @ts-expect-error - agents/mcp ships its own bundled @modelcontextprotocol/sdk;
	// our installed sdk has a private `_serverInfo` field with a different declaration.
	server = new McpServer({
		name: "supermemory",
		version: "1.0.0",
	})

	async init() {
		const stored = await this.ctx.storage.get<{
			name: string
			version?: string
		}>("clientInfo")
		if (stored) this.clientInfo = stored

		this.server.server.oninitialized = async () => {
			const v = this.server.server.getClientVersion()
			if (v) {
				this.clientInfo = { name: v.name, version: v.version }
				await this.ctx.storage.put("clientInfo", this.clientInfo)
			}
		}

		const deps = {
			server: this.server,
			props: this.props,
			getClient: (containerTag?: string) => this.getClient(containerTag),
			getSession: () => this.getSession(),
			resolveContainerTag: (explicit?: string) =>
				this.resolveContainerTag(explicit),
			getActiveContainerTag: () => this.getActiveContainerTag(),
			setActiveContainerTag: (containerTag: string) =>
				this.setActiveContainerTag(containerTag),
			getClientInfo: () => this.clientInfo,
			getMcpSessionId: () => this.getSessionId(),
			errorResult,
		}

		registerAllTools(deps)

		registerProfileResource(this.server, () => this.getClient())
		registerContainerTagsResource(this.server, () => this.getClient())
		registerWidgetResource(this.server)

		registerContextPrompt(
			this.server,
			!!this.props?.containerTag,
			(tag) => this.getClient(tag),
			(explicit) => this.resolveContainerTag(explicit),
		)
	}

	private getClient(containerTag?: string): SupermemoryClient {
		return new SupermemoryClient(
			this.props?.bearerToken || "",
			containerTag || this.props?.containerTag,
			this.env.API_URL || DEFAULT_API_URL,
		)
	}

	private async resolveContainerTag(
		explicit?: string,
	): Promise<string | undefined> {
		if (this.props?.containerTag) return this.props.containerTag
		if (explicit) return explicit
		const activeTag = await this.getActiveContainerTag()
		if (activeTag) return activeTag
		return undefined
	}

	private workspaceState() {
		const userId = this.props?.userId
		if (!userId) throw new Error("Authenticated user ID is required")
		const organizationId = this.props?.organizationId ?? "default"
		return this.env.MCP_SERVER.getByName(
			`workspace-state:${userId}:${organizationId}`,
		)
	}

	private getActiveContainerTag(): Promise<string | undefined> {
		return this.workspaceState().readActiveContainerTag()
	}

	private setActiveContainerTag(containerTag: string): Promise<void> {
		return this.workspaceState().writeActiveContainerTag(containerTag)
	}

	async readActiveContainerTag(): Promise<string | undefined> {
		return this.ctx.storage.get<string>(ACTIVE_CONTAINER_TAG_KEY)
	}

	async writeActiveContainerTag(containerTag: string): Promise<void> {
		await this.ctx.storage.put(ACTIVE_CONTAINER_TAG_KEY, containerTag)
	}

	private getSession() {
		return fetchSession(
			this.props?.bearerToken || "",
			this.env.API_URL || DEFAULT_API_URL,
		)
	}
}
