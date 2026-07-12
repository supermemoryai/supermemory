import type { UserData } from "./storage"

const EXTENSION_AUTH_HOSTS = new Set([
	"localhost",
	"127.0.0.1",
	"supermemory.ai",
	"app.supermemory.ai",
])

const SESSION_COOKIE_NAMES = [
	"__Secure-better-auth.session_token",
	"better-auth.session_token",
	"__Secure-better-auth-session_token",
	"better-auth-session_token",
	"__Secure-better-auth-dev.session_token",
	"better-auth-dev.session_token",
	"__Secure-better-auth-dev-session_token",
	"better-auth-dev-session_token",
]

interface ExtensionAuthCookie {
	name: string
	value: string
}

interface ExtensionSessionResponse {
	user?: {
		id?: string
		email?: string
		name?: string
	}
}

export function isExtensionAuthUrl(rawUrl: string): boolean {
	try {
		const url = new URL(rawUrl)
		const allowedProtocol =
			url.protocol === "https:" ||
			(url.protocol === "http:" &&
				(url.hostname === "localhost" || url.hostname === "127.0.0.1"))
		return (
			allowedProtocol &&
			EXTENSION_AUTH_HOSTS.has(url.hostname) &&
			url.searchParams.get("extension-auth-success") === "true"
		)
	} catch {
		return false
	}
}

export function getSessionToken(cookies: ExtensionAuthCookie[]): string | null {
	for (const name of SESSION_COOKIE_NAMES) {
		const cookie = cookies.find((candidate) => candidate.name === name)
		if (cookie?.value) return cookie.value
	}
	return null
}

export async function getExtensionAuthCredentials(
	pageUrl: string,
	cookies: ExtensionAuthCookie[],
	apiUrl: string,
	fetchSession: typeof fetch = fetch,
): Promise<{ token: string; user: UserData }> {
	if (!isExtensionAuthUrl(pageUrl)) {
		throw new Error("Extension auth is not allowed from this page")
	}

	const token = getSessionToken(cookies)
	if (!token) throw new Error("Session cookie not found")

	const response = await fetchSession(`${apiUrl}/v3/session`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	})
	if (!response.ok) throw new Error("Session validation failed")

	const session = (await response.json()) as ExtensionSessionResponse
	if (!session.user?.id) throw new Error("Session user not found")

	return {
		token,
		user: {
			userId: session.user.id,
			email: session.user.email,
			name: session.user.name,
		},
	}
}
