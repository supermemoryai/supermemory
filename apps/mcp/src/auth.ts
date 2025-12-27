/**
 * OAuth token validation via API introspection
 *
 * This validates OAuth tokens by calling the main Supermemory API,
 * avoiding the need to share database credentials or secrets.
 * It also retrieves a fresh API key for making API calls.
 */

export interface OAuthUser {
	userId: string
	apiKey: string
	email?: string
	name?: string
}

/**
 * Validate OAuth token by calling the main API's MCP session endpoint.
 * The main API validates the token via better-auth and returns user info + API key.
 */
export async function validateOAuthToken(
	token: string,
	apiUrl: string,
): Promise<OAuthUser | null> {
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
