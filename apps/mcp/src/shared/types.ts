// Shared types — imported by both server tools and widget views.
// Single source of truth for the server↔widget contract.

export interface ContainerTagAccess {
	containerTag: string
	permission: "read" | "write"
}

export interface SessionScope {
	type: "full" | "scoped"
	permission?: "read" | "write"
	tag?: string
	tags?: string[]
	rateLimit?: number
	expires?: string
}

export interface SessionInfo {
	user: {
		id: string
		email?: string
		name?: string
	}
	role?: string
	accessType?: "full" | "restricted"
	containerTags?: ContainerTagAccess[] | null
	scope?: SessionScope
}

export interface ContainerTag {
	id: string
	name: string
	containerTag: string
	createdAt: string
	updatedAt: string
	isExperimental: boolean
	emoji?: string
	isNova: boolean
	documentCount: number
	memoryCount: number
	lastActivityAt: string | null
}

export interface DocumentMemoryEntry {
	id: string
	memory: string
	spaceId: string
	isStatic?: boolean
	isLatest?: boolean
	isForgotten?: boolean
	forgetAfter?: string | null
	forgetReason?: string | null
	version?: number
	parentMemoryId?: string | null
	rootMemoryId?: string | null
	memoryRelations?: Record<string, string>
	createdAt: string
	updatedAt: string
}

export interface DocumentWithMemories {
	id: string
	title: string | null
	summary?: string | null
	type: string
	createdAt: string
	updatedAt: string
	memoryEntries: DocumentMemoryEntry[]
}

export interface DocumentsApiResponse {
	documents: DocumentWithMemories[]
	pagination: {
		currentPage: number
		limit: number
		totalItems: number
		totalPages: number
	}
}

// ViewMessage — discriminated union returned by app tools as `structuredContent`.
// The widget uses an exhaustive switch on `view` to dispatch to the correct view component.
// Adding a new view here is a compile error in App.tsx until the case is handled.
export type ViewMessage =
	| {
			view: "picker"
			containerTags: ContainerTag[]
			activeTag?: string | null
			assignedTags?: ContainerTagAccess[] | null
	  }
	| { view: "confirmation"; containerTag: string }
	| {
			view: "save"
			activeTag?: string | null
			writableTags: string[]
			prefill?: string
	  }
	| { view: "save-success"; id: string; containerTag: string }
	| {
			view: "upload"
			activeTag?: string | null
			writableTags: string[]
	  }
	| {
			view: "upload-success"
			id: string
			fileName: string
			containerTag: string
	  }
	| {
			view: "graph"
			documents: DocumentWithMemories[]
			totalCount: number
			containerTag?: string
	  }

export type ViewName = ViewMessage["view"]

// Auth context passed from the OAuth/API-key middleware into the McpAgent via ctx.props.
export type Props = {
	userId: string
	organizationId?: string
	bearerToken: string
	containerTag?: string
}

// Hosts cache MCP UI resources by URI, so bump this when shipping a new widget bundle.
export const SUPERMEMORY_RESOURCE_URI = "ui://supermemory/app-v2.html"
