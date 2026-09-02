import { getBackendUrl } from "./url-helpers"

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

// `bun run dev:local` serves localhost while auth lives on api.supermemory.ai, so its cookie never arrives.
function isLocalDevRequest(request: Request): boolean {
	if (process.env.NODE_ENV !== "development") {
		return false
	}
	try {
		return LOCAL_DEV_HOSTS.has(new URL(request.url).hostname)
	} catch {
		return false
	}
}

// middleware.ts only checks the cookie is present; metered/proxy routes must verify it server-side.
export async function hasVerifiedSession(request: Request): Promise<boolean> {
	if (isLocalDevRequest(request)) {
		return true
	}

	const cookie = request.headers.get("cookie")
	if (!cookie) {
		return false
	}

	try {
		const response = await fetch(`${getBackendUrl()}/api/auth/get-session`, {
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
				session.user,
		)
	} catch {
		return false
	}
}
