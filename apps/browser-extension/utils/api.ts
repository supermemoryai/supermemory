/**
 * API service for supermemory browser extension
 */
import { API_ENDPOINTS, STORAGE_KEYS } from "./constants"
import {
	AuthenticationError,
	type MemoryPayload,
	type Project,
	type ProjectsResponse,
	SupermemoryAPIError,
} from "./types"

/**
 * Get bearer token from storage
 */
async function getBearerToken(): Promise<string> {
	const result = await chrome.storage.local.get([STORAGE_KEYS.BEARER_TOKEN])
	const token = result[STORAGE_KEYS.BEARER_TOKEN]

	if (!token) {
		throw new AuthenticationError("Bearer token not found")
	}

	return token
}

/**
 * Make authenticated API request
 */
async function makeAuthenticatedRequest<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const token = await getBearerToken()

	const response = await fetch(`${API_ENDPOINTS.SUPERMEMORY_API}${endpoint}`, {
		...options,
		credentials: "omit",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			...options.headers,
		},
	})

	if (!response.ok) {
		if (response.status === 401) {
			throw new AuthenticationError("Invalid or expired token")
		}
		throw new SupermemoryAPIError(
			`API request failed: ${response.statusText}`,
			response.status,
		)
	}

	return response.json()
}

/**
 * Fetch all projects from API
 */
export async function fetchProjects(): Promise<Project[]> {
	try {
		const response =
			await makeAuthenticatedRequest<ProjectsResponse>("/v3/projects")
		return response.projects
	} catch (error) {
		console.error("Failed to fetch projects:", error)
		throw error
	}
}

/**
 * Get default project from storage
 */
export async function getDefaultProject(): Promise<Project | null> {
	try {
		const result = await chrome.storage.local.get([
			STORAGE_KEYS.DEFAULT_PROJECT,
		])
		return result[STORAGE_KEYS.DEFAULT_PROJECT] || null
	} catch (error) {
		console.error("Failed to get default project:", error)
		return null
	}
}

/**
 * Set default project in storage
 */
export async function setDefaultProject(project: Project): Promise<void> {
	try {
		await chrome.storage.local.set({
			[STORAGE_KEYS.DEFAULT_PROJECT]: project,
		})
	} catch (error) {
		console.error("Failed to set default project:", error)
		throw error
	}
}

/**
 * Save memory to Supermemory API
 */
export async function saveMemory(payload: MemoryPayload): Promise<unknown> {
	try {
		const response = await makeAuthenticatedRequest<unknown>("/v3/memories", {
			method: "POST",
			body: JSON.stringify(payload),
		})
		return response
	} catch (error) {
		console.error("Failed to save memory:", error)
		throw error
	}
}

/**
 * Search memories using Supermemory API
 */
export async function searchMemories(query: string): Promise<unknown> {
	try {
		const response = await makeAuthenticatedRequest<unknown>("/v3/search", {
			method: "POST",
			body: JSON.stringify({ q: query }),
		})
		return response
	} catch (error) {
		console.error("Failed to search memories:", error)
		throw error
	}
}

/**
 * Save tweet to Supermemory API (specific for Twitter imports)
 */
export async function saveTweet(
	content: string,
	metadata: { sm_source: string; [key: string]: unknown },
	containerTag = "sm_project_twitter_bookmarks",
): Promise<void> {
	try {
		const payload: MemoryPayload = {
			containerTags: [containerTag],
			content,
			metadata,
		}
		await saveMemory(payload)
	} catch (error) {
		if (error instanceof SupermemoryAPIError && error.statusCode === 409) {
			// Skip if already exists (409 Conflict)
			return
		}
		throw error
	}
}
