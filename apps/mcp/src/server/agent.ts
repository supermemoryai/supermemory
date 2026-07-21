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
	MCP_SERVER: DurableObjectNamespace
	API_URL?: string
}

const DEFAULT_API_URL = "https://api.supermemory.ai"

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
			storage: {
				get: <T>(key: string) => this.ctx.storage.get<T>(key),
				put: <T>(key: string, value: T) => this.ctx.storage.put(key, value),
			},
			getClientInfo: () => this.clientInfo,
			getMcpSessionId: () => this.ctx.id.name ?? "unknown",
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
		if (explicit) return explicit
		const activeTag = await this.ctx.storage.get<string>("activeContainerTag")
		if (activeTag) return activeTag
		return this.props?.containerTag
	}

	private getSession() {
		return fetchSession(
			this.props?.bearerToken || "",
			this.env.API_URL || DEFAULT_API_URL,
		)
	}
}
