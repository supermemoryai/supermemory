/**
 * Type definitions for the browser extension
 */

/**
 * Toast states for UI feedback
 */
export type ToastState = "loading" | "success" | "error"

/**
 * Message types for extension communication
 */
export interface ExtensionMessage {
	isFolderImport?: boolean
	bookmarkCollectionId?: string
	action?: string
	type?: string
	data?: unknown
	state?: ToastState
	importedMessage?: string
	totalImported?: number
	actionSource?: string
	selectedProject?: {
		id: string
		name: string
		containerTag: string
	}
}

/**
 * Memory data structure for saving content
 */
export interface MemoryData {
	html?: string
	markdown?: string
	content?: string
	highlightedText?: string
	url?: string
	ogImage?: string
	title?: string
}

/**
 * Supermemory API payload for storing memories
 */
export interface MemoryPayload {
	containerTags?: string[]
	content: string
	metadata: {
		sm_source: string
		[key: string]: unknown
	}
	customId?: string
}

/**
 * Twitter-specific memory metadata
 */
export interface TwitterMemoryMetadata {
	sm_source: "twitter_bookmarks"
	tweet_id: string
	author: string
	created_at: string
	likes: number
	retweets: number
}

/**
 * Storage data structure for Chrome storage
 */
export interface StorageData {
	bearerToken?: string
	twitterAuth?: {
		cookie: string
		csrf: string
		auth: string
	}
	tokens_logged?: boolean
	cookie?: string
	csrf?: string
	auth?: string
	defaultProject?: Project
	projectsCache?: {
		projects: Project[]
		timestamp: number
	}
}

/**
 * Context menu click info
 */
export interface ContextMenuClickInfo {
	menuItemId: string | number
	editable?: boolean
	frameId?: number
	frameUrl?: string
	linkUrl?: string
	mediaType?: string
	pageUrl?: string
	parentMenuItemId?: string | number
	selectionText?: string
	srcUrl?: string
	targetElementId?: number
	wasChecked?: boolean
}

/**
 * API Response types
 */
export interface APIResponse<T = unknown> {
	success: boolean
	data?: T
	error?: string
}

/**
 * Error types for better error handling
 */
export class ExtensionError extends Error {
	constructor(
		message: string,
		public code?: string,
		public statusCode?: number,
	) {
		super(message)
		this.name = "ExtensionError"
	}
}

export class TwitterAPIError extends ExtensionError {
	constructor(message: string, statusCode?: number) {
		super(message, "TWITTER_API_ERROR", statusCode)
		this.name = "TwitterAPIError"
	}
}

export class SupermemoryAPIError extends ExtensionError {
	constructor(message: string, statusCode?: number) {
		super(message, "SUPERMEMORY_API_ERROR", statusCode)
		this.name = "SupermemoryAPIError"
	}
}

export class AuthenticationError extends ExtensionError {
	constructor(message = "Authentication required") {
		super(message, "AUTH_ERROR")
		this.name = "AuthenticationError"
	}
}

export interface Project {
	id: string
	name: string
	containerTag: string
	createdAt: string
	updatedAt: string
	documentCount: number
}

export interface ProjectsResponse {
	projects: Project[]
}
