import { PostHog } from "posthog-node"

const MCP_SERVER_VERSION = "3.0.0"
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY

let instance: PostHog | null = null

function getInstance(): PostHog | null {
	if (!instance && POSTHOG_API_KEY) {
		instance = new PostHog(POSTHOG_API_KEY, {
			host: "https://us.i.posthog.com",
			flushAt: 1,
			flushInterval: 0,
		})
	} else {
		console.warn("PostHog client not initialized - missing POSTHOG_API_KEY")
	}
	return instance
}

export async function memoryAdded(props: {
	type: "note" | "link" | "file"
	project_id?: string
	content_length?: number
	file_size?: number
	file_type?: string
	source?: string
	userId: string
	mcp_client_name?: string
	mcp_client_version?: string
	sessionId?: string
	containerTag?: string
}): Promise<void> {
	const client = getInstance()

	if (!client) {
		console.warn("PostHog client not initialized")
		return
	}

	try {
		client.capture({
			distinctId: props.userId,
			event: "memory_added",
			properties: {
				...props,
				mcp_server_version: MCP_SERVER_VERSION,
			},
		})

		await client.flush()
	} catch (error) {
		console.error("PostHog tracking error:", error)
	}
}

export async function memorySearch(props: {
	query_length: number
	results_count: number
	search_duration_ms: number
	container_tags_count?: number
	source?: string
	userId: string
	mcp_client_name?: string
	mcp_client_version?: string
	sessionId?: string
	containerTag?: string
}): Promise<void> {
	const client = getInstance()

	if (!client) {
		console.warn("PostHog client not initialized")
		return
	}

	try {
		client.capture({
			distinctId: props.userId,
			event: "memory_search",
			properties: {
				...props,
				mcp_server_version: MCP_SERVER_VERSION,
			},
		})

		await client.flush()
	} catch (error) {
		console.error("PostHog tracking error:", error)
	}
}

export async function memoryForgot(props: {
	userId: string
	content_length?: number
	source?: string
	mcp_client_name?: string
	mcp_client_version?: string
	sessionId?: string
	containerTag?: string
}): Promise<void> {
	const client = getInstance()

	if (!client) {
		console.warn("PostHog client not initialized")
		return
	}

	try {
		client.capture({
			distinctId: props.userId,
			event: "memory_forgot",
			properties: {
				...props,
				mcp_server_version: MCP_SERVER_VERSION,
			},
		})

		await client.flush()
	} catch (error) {
		console.error("PostHog tracking error:", error)
	}
}

export async function shutdown(): Promise<void> {
	if (instance) {
		await instance.shutdown()
		instance = null
	}
}

export const posthog = {
	memoryAdded,
	memorySearch,
	memoryForgot,
	shutdown,
}
