const BACKEND_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

/**
 * Verify the request's Better Auth session against the auth backend.
 *
 * The Next middleware (`middleware.ts`) only checks that a session cookie is
 * *present* — better-auth's documented optimistic check for UI redirects. It
 * never validates the token value, so a forged cookie passes the edge gate.
 * Route handlers that spend metered third-party quota or proxy arbitrary URLs
 * must therefore verify the session server-side before doing work.
 *
 * Returns true only when the backend confirms a live session for the
 * forwarded cookies.
 */
export async function hasVerifiedSession(request: Request): Promise<boolean> {
	const cookie = request.headers.get("cookie")
	if (!cookie) {
		return false
	}

	try {
		const response = await fetch(`${BACKEND_URL}/api/auth/get-session`, {
			headers: { cookie },
			redirect: "error",
			cache: "no-store",
		})
		if (!response.ok) {
			return false
		}
		const session: unknown = await response.json()
		return Boolean(
			session &&
				typeof session === "object" &&
				"user" in session &&
				(session as { user?: unknown }).user,
		)
	} catch {
		return false
	}
}
