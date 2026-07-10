import { getSessionCookie } from "better-auth/cookies"
import { NextResponse } from "next/server"
import { getPublicRequestUrl } from "@/lib/url-helpers"

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "::1"])

function getAuthSessionCookie(request: Request): string | null {
	return (
		getSessionCookie(request) ??
		getSessionCookie(request, { cookiePrefix: "better-auth-dev" })
	)
}

export default async function proxy(request: Request) {
	console.debug("[PROXY] === PROXY START ===")
	const url = getPublicRequestUrl(request)

	console.debug("[PROXY] Path:", url.pathname)
	console.debug("[PROXY] Method:", request.method)

	if (LOCAL_DEV_HOSTS.has(url.hostname)) {
		console.debug("[PROXY] Local dev host, allowing access")
		return NextResponse.next()
	}

	const sessionCookie = getAuthSessionCookie(request)
	console.debug("[PROXY] Session cookie exists:", !!sessionCookie)

	// Always allow access to login and waitlist pages
	const publicPaths = ["/login", "/login/new"]
	if (publicPaths.includes(url.pathname)) {
		console.debug("[PROXY] Public path, allowing access")
		return NextResponse.next()
	}

	// MCP setup page is public — no auth required
	if (url.searchParams.get("view") === "mcp") {
		return NextResponse.next()
	}

	// Integrations index is public in guest mode; actions still require login.
	if (url.pathname === "/" && url.searchParams.get("view") === "integrations") {
		return NextResponse.next()
	}

	// Real integrations routes, public in guest mode (mirrors view=integrations / view=mcp).
	if (
		url.pathname === "/integrations" ||
		url.pathname === "/integrations/mcp"
	) {
		return NextResponse.next()
	}

	if (url.pathname.startsWith("/api/")) {
		if (!sessionCookie) {
			console.debug("[MIDDLEWARE] API route without session, returning 401")
			return new Response(JSON.stringify({ error: "Unauthorized" }), {
				status: 401,
				headers: { "Content-Type": "application/json" },
			})
		}
		console.debug("[MIDDLEWARE] API route with session, allowing access")
		return NextResponse.next()
	}

	// If no session cookie and not on a public path, redirect to login
	if (!sessionCookie) {
		console.debug(
			"[PROXY] No session cookie and not on public path, redirecting to /login",
		)
		const loginUrl = new URL("/login", url.origin)
		loginUrl.searchParams.set("redirect", url.toString())
		return NextResponse.redirect(loginUrl)
	}

	// TEMPORARILY DISABLED: Waitlist check
	// if (url.pathname !== "/waitlist") {
	// 	const response = await $fetch("@get/waitlist/status", {
	// 		headers: {
	// 			Authorization: `Bearer ${sessionCookie}`,
	// 		},

	// 	console.debug("[PROXY] Waitlist status:", response.data);
	// 	if (response.data && !response.data.accessGranted) {
	// 		return NextResponse.redirect(new URL("/waitlist", request.url));
	// 	}
	// }

	console.debug("[PROXY] Passing through to next handler")
	console.debug("[PROXY] === PROXY END ===")
	const response = NextResponse.next()
	response.cookies.set({
		name: "last-site-visited",
		value: "https://app.supermemory.ai",
		domain: "supermemory.ai",
	})
	return response
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|images|icon.png|favicon.ico|favicon-16x16.png|favicon-32x32.png|apple-touch-icon.png|android-chrome-192x192.png|android-chrome-512x512.png|manifest.webmanifest|site.webmanifest|monitoring|opengraph-image.png|bg-rectangle.png|onboarding|ingest|login|api/emails|mcp-supported-tools|mcp-icon.svg).*)",
	],
}
