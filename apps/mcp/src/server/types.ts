import type { SpaceState } from "./space-state"

export interface ActorContext {
	userId: string
	organizationId: string
	bearerToken: string
	oauthClientId?: string
}

export interface ServerEnv {
	SPACE_STATE: DurableObjectNamespace<SpaceState>
	API_URL?: string
	MCP_RESOURCE?: string
	MCP_PUBLIC_ORIGIN?: string
	ALLOWED_MCP_ORIGIN_HOSTNAMES?: string
	POSTHOG_API_KEY?: string
	POSTHOG_HOST?: string
	OPENAI_APPS_CHALLENGE?: string
}
