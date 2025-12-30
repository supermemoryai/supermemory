/**
 * Authentication via API introspection
 *
 * This validates OAuth tokens and API keys by calling the main Supermemory API,
 */

export interface AuthUser {
	userId: string
	apiKey: string
	email?: string
	name?: string
}

/**
 * Check if a token is an API key (starts with "sm_")
 */
export function isApiKey(token: string): boolean {
	return token.startsWith("sm_")
}

/**
 * Validate API key by calling the main API's session endpoint.
 * Returns user info if the API key is valid.
 */
export async function validateApiKey(
	apiKey: string,
	apiUrl: string,
): Promise<AuthUser | null> {
	try {
		const sessionResponse = await fetch(`${apiUrl}/v3/session`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		})

		if (!sessionResponse.ok) {
			const responseText = await sessionResponse.text()
			const status = sessionResponse.status

			if (status === 401) {
				console.error("API key validation failed: Invalid or expired API key")
			} else if (status === 403) {
				console.error(
					"API key validation failed: User is blocked or access forbidden",
					responseText,
				)
			} else if (status === 429) {
				console.error("API key validation failed: Rate limit exceeded")
			} else if (status >= 500) {
				console.error(
					"API key validation failed: Server error",
					status,
					responseText,
				)
			} else {
				console.error("API key validation failed:", status, responseText)
			}
			return null
		}

		const sessionData = (await sessionResponse.json()) as {
			user?: {
				id?: string
				email?: string
				name?: string
			}
			session?: unknown
			org?: unknown
			error?: string
		} | null

		if (!sessionData?.user?.id) {
			console.error("Missing user.id in session response:", sessionData)
			return null
		}

		console.log("API key validated for user:", sessionData.user.id)

		return {
			userId: sessionData.user.id,
			apiKey: apiKey,
			email: sessionData.user.email,
			name: sessionData.user.name,
		}
	} catch (error) {
		console.error("API key validation error:", error)
		return null
	}
}

/**
 * Validate OAuth token by calling the main API's MCP session endpoint.
 * The main API validates the token via better-auth and returns user info + API key.
 */
export async function validateOAuthToken(
	token: string,
	apiUrl: string,
): Promise<AuthUser | null> {
	try {
		const sessionResponse = await fetch(`${apiUrl}/v3/mcp/session-with-key`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		})

		if (!sessionResponse.ok) {
			const responseText = await sessionResponse.text()
			const status = sessionResponse.status

			if (status === 401) {
				console.error("Token validation failed: Invalid or expired token")
			} else if (status === 403) {
				console.error(
					"Token validation failed: User is blocked or access forbidden",
					responseText,
				)
			} else if (status === 429) {
				console.error("Token validation failed: Rate limit exceeded")
			} else if (status >= 500) {
				console.error(
					"Token validation failed: Server error",
					status,
					responseText,
				)
			} else {
				console.error("Token validation failed:", status, responseText)
			}
			return null
		}

		const sessionData = (await sessionResponse.json()) as {
			userId?: string
			apiKey?: string
			email?: string
			name?: string
			error?: string
		} | null

		if (!sessionData?.userId || !sessionData?.apiKey) {
			console.error(
				"Missing userId or apiKey in session response:",
				sessionData,
			)
			return null
		}

		console.log("OAuth validated, got API key for user:", sessionData.userId)

		return {
			userId: sessionData.userId,
			apiKey: sessionData.apiKey,
			email: sessionData.email,
			name: sessionData.name,
		}
	} catch (error) {
		console.error("Token validation error:", error)
		return null
	}
}
