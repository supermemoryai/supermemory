/**
 * Authentication via API introspection.
 * Validates OAuth tokens and API keys by calling the main Supermemory API.
 * Extended with RBAC data (role, accessType, containerTags).
 */

import type { ContainerTagAccess } from "../../shared/types"

const FETCH_TIMEOUT_MS = 30_000

export type { ContainerTagAccess }

export interface AuthUser {
	userId: string
	apiKey: string
	email?: string
	name?: string
	role?: string // "owner" | "admin" | "member"
	accessType?: string // "full" | "restricted"
	containerTags?: ContainerTagAccess[] | null
}

export function isApiKey(token: string): boolean {
	return token.startsWith("sm_")
}

export async function validateApiKey(
	apiKey: string,
	apiUrl: string,
): Promise<AuthUser | null> {
	try {
		const response = await fetch(`${apiUrl}/v3/session`, {
			method: "GET",
			headers: { Authorization: `Bearer ${apiKey}` },
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		})

		if (!response.ok) {
			const status = response.status
			if (status === 401) {
				console.error("API key validation failed: Invalid or expired")
			} else if (status === 403) {
				console.error("API key validation failed: Blocked or forbidden")
			} else if (status === 429) {
				console.error("API key validation failed: Rate limited")
			} else {
				console.error("API key validation failed:", status)
			}
			return null
		}

		const data = (await response.json()) as {
			user?: { id?: string; email?: string; name?: string }
			role?: string
			accessType?: string
			containerTags?: ContainerTagAccess[] | null
			error?: string
		} | null

		if (!data?.user?.id) {
			console.error("Missing user.id in session response")
			return null
		}

		return {
			userId: data.user.id,
			apiKey,
			email: data.user.email,
			name: data.user.name,
			role: data.role,
			accessType: data.accessType,
			containerTags: data.containerTags,
		}
	} catch (error) {
		console.error("API key validation error:", error)
		return null
	}
}

export async function validateOAuthToken(
	token: string,
	apiUrl: string,
): Promise<AuthUser | null> {
	try {
		const response = await fetch(`${apiUrl}/v3/mcp/session-with-key`, {
			method: "GET",
			headers: { Authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
		})

		if (!response.ok) {
			const status = response.status
			if (status === 401) {
				console.error("Token validation failed: Invalid or expired")
			} else if (status === 403) {
				console.error("Token validation failed: Blocked or forbidden")
			} else if (status === 429) {
				console.error("Token validation failed: Rate limited")
			} else {
				console.error("Token validation failed:", status)
			}
			return null
		}

		const data = (await response.json()) as {
			userId?: string
			apiKey?: string
			email?: string
			name?: string
			error?: string
		} | null

		if (!data?.userId || !data?.apiKey) {
			console.error("Missing userId or apiKey in session response")
			return null
		}

		// Fetch RBAC data using the exchanged API key.
		// Fail-closed: if RBAC fetch fails or is non-OK, return null. A
		// transient failure here previously left accessType=undefined, which
		// `buildRbacContext` interpreted as "not restricted" — silently
		// elevating a restricted user.
		let role: string | undefined
		let accessType: string | undefined
		let containerTags: ContainerTagAccess[] | null = null

		try {
			const rbacResponse = await fetch(`${apiUrl}/v3/session`, {
				method: "GET",
				headers: { Authorization: `Bearer ${data.apiKey}` },
				signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			})
			if (!rbacResponse.ok) {
				console.error("RBAC fetch returned non-OK:", rbacResponse.status)
				return null
			}
			const rbac = (await rbacResponse.json()) as {
				role?: string
				accessType?: string
				containerTags?: ContainerTagAccess[] | null
			}
			role = rbac.role
			accessType = rbac.accessType
			containerTags = rbac.containerTags ?? null
		} catch (err) {
			console.error("Failed to fetch RBAC data:", err)
			return null
		}

		return {
			userId: data.userId,
			apiKey: data.apiKey,
			email: data.email,
			name: data.name,
			role,
			accessType,
			containerTags,
		}
	} catch (error) {
		console.error("Token validation error:", error)
		return null
	}
}
