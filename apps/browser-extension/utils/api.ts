/**
 * API service for supermemory browser extension
 */
import { API_ENDPOINTS } from "./constants"
import { bearerToken, defaultProject, userData } from "./storage"
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
	const token = await bearerToken.getValue()

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
		const defaultProjectValue = await defaultProject.getValue()
		return defaultProjectValue || null
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
		await defaultProject.setValue(project)
	} catch (error) {
		console.error("Failed to set default project:", error)
		throw error
	}
}

/**
 * Validate if current bearer token is still valid
 */
export async function validateAuthToken(): Promise<boolean> {
	try {
		await makeAuthenticatedRequest<ProjectsResponse>("/v3/projects")
		return true
	} catch (error) {
		if (error instanceof AuthenticationError) {
			return false
		}
		console.error("Failed to validate auth token:", error)
		return true
	}
}

/**
 * Get user data from storage
 */
export async function getUserData(): Promise<{ email?: string } | null> {
	try {
		return (await userData.getValue()) || null
	} catch (error) {
		console.error("Failed to get user data:", error)
		return null
	}
}

/**
 * Save memory to Supermemory API
 */
export async function saveMemory(payload: MemoryPayload): Promise<unknown> {
	try {
		const response = await makeAuthenticatedRequest<unknown>("/v3/documents", {
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
		const response = await makeAuthenticatedRequest<unknown>("/v4/search", {
			method: "POST",
			body: JSON.stringify({ q: query, include: { relatedMemories: true } }),
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
export async function saveAllTweets(
	documents: MemoryPayload[],
): Promise<unknown> {
	try {
		const response = await makeAuthenticatedRequest<unknown>(
			"/v3/documents/batch",
			{
				method: "POST",
				body: JSON.stringify({
					documents,
					metadata: {
						sm_source: "consumer",
						sm_internal_group_id: "twitter_bookmarks",
					},
				}),
			},
		)
		return response
	} catch (error) {
		if (error instanceof SupermemoryAPIError && error.statusCode === 409) {
			// Skip if already exists (409 Conflict)
			return
		}
		throw error
	}
}
