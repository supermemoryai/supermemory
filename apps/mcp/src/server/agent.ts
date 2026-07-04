import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { McpAgent } from "agents/mcp"
import type { Props } from "../shared/types"
import { buildRbacContext } from "./auth/rbac"
import { SupermemoryClient } from "./client"
import { registerContextPrompt } from "./prompts/context"
import { registerContainerTagsResource } from "./resources/container-tags"
import { registerProfileResource } from "./resources/profile"
import { registerWidgetResource } from "./resources/widget"
import { registerAllTools } from "./tools"
import { appErrorResult, errorResult } from "./tools/types"

type Env = {
	MCP_SERVER: DurableObjectNamespace
	API_URL?: string
	AUTH_CACHE?: KVNamespace
}

const DEFAULT_API_URL = "https://api.supermemory.ai"

export class SupermemoryMCP extends McpAgent<Env, unknown, Props> {
	private clientInfo: { name: string; version?: string } | null = null
	private cachedContainerTagsList: string[] = []

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

		await this.refreshContainerTags()

		const rbac = buildRbacContext(this.props)

		if (rbac.isRestricted && rbac.assignedTags.length === 1) {
			await this.ctx.storage.put(
				"activeContainerTag",
				rbac.assignedTags[0].containerTag,
			)
		}

		const deps = {
			server: this.server,
			props: this.props,
			rbac,
			getClient: (containerTag?: string) => this.getClient(containerTag),
			resolveContainerTag: (explicit?: string) =>
				this.resolveContainerTag(explicit),
			storage: {
				get: <T>(key: string) => this.ctx.storage.get<T>(key),
				put: <T>(key: string, value: T) => this.ctx.storage.put(key, value),
			},
			cachedContainerTags: () => this.cachedContainerTagsList,
			refreshContainerTags: () => this.refreshContainerTags(),
			getClientInfo: () => this.clientInfo,
			getMcpSessionId: () => this.ctx.id.name ?? "unknown",
			errorResult,
			appErrorResult,
		}

		registerAllTools(deps)

		registerProfileResource(this.server, () => this.getClient())
		registerContainerTagsResource(this.server, () => this.getClient())
		registerWidgetResource(this.server)

		registerContextPrompt(
			this.server,
			rbac,
			(tag) => this.getClient(tag),
			(explicit) => this.resolveContainerTag(explicit),
		)
	}

	private getClient(containerTag?: string): SupermemoryClient {
		return new SupermemoryClient(
			this.props?.apiKey || "",
			containerTag || this.props?.containerTag,
			this.env.API_URL || DEFAULT_API_URL,
		)
	}

	private async resolveContainerTag(
		explicit?: string,
	): Promise<string | undefined> {
		if (explicit) return explicit
		const activeTag = await this.ctx.storage.get<string>("activeContainerTag")
		return activeTag || this.props?.containerTag
	}

	private async refreshContainerTags(): Promise<boolean> {
		try {
			const client = this.getClient()
			const tags = await client.listContainerTags()
			this.cachedContainerTagsList = tags.map((t) => t.containerTag)
			return true
		} catch (error) {
			console.error("Failed to refresh container tags:", error)
			return false
		}
	}
}
