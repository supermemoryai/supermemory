export type McpDirectoryAvailability =
	| "fixed"
	| "tenant"
	| "unavailable"
	| "local"

export type McpDirectoryEntry = {
	id: string
	name: string
	type: "remote" | "local"
	url: string | null
	auth: string
	note: string | null
	categories: string[]
	popularity: number
	availability: McpDirectoryAvailability
	iconDomain: string | null
	setup: "custom" | "unsupported"
	oauthCapability: "dcr" | "preregistered" | null
	authMethods: Array<"oauth" | "api-key">
}
