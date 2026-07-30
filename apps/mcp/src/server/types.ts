import type { WorkspaceState } from "./workspace-state"

export interface ActorContext {
	userId: string
	organizationId: string
	bearerToken: string
	oauthClientId?: string
}

export interface ServerEnv {
	WORKSPACE_STATE: DurableObjectNamespace<WorkspaceState>
	API_URL?: string
	MCP_RESOURCE?: string
	ALLOWED_MCP_ORIGIN_HOSTNAMES?: string
	POSTHOG_API_KEY?: string
	POSTHOG_HOST?: string
}
