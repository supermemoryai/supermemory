import { getSessionCookie } from "better-auth/cookies"
import { NextResponse } from "next/server"

export default async function middleware(request: Request) {
	console.debug("[MIDDLEWARE] === MIDDLEWARE START ===")
	const url = new URL(request.url)
	console.debug("[MIDDLEWARE] Path:", url.pathname)
	console.debug("[MIDDLEWARE] Method:", request.method)

	const sessionCookie = getSessionCookie(request)
	console.debug("[MIDDLEWARE] Session cookie exists:", !!sessionCookie)

	// Always allow access to login and waitlist pages
	const publicPaths = ["/login"]
	if (publicPaths.includes(url.pathname)) {
		console.debug("[MIDDLEWARE] Public path, allowing access")
		return NextResponse.next()
	}

	// If no session cookie and not on a public path, redirect to login
	if (!sessionCookie) {
		console.debug(
			"[MIDDLEWARE] No session cookie and not on public path, redirecting to /login",
		)
		const url = new URL("/login", request.url)
		url.searchParams.set("redirect", request.url)
		return NextResponse.redirect(url)
	}

	// TEMPORARILY DISABLED: Waitlist check
	// if (url.pathname !== "/waitlist") {
	// 	const response = await $fetch("@get/waitlist/status", {
	// 		headers: {
	// 			Authorization: `Bearer ${sessionCookie}`,
	// 		},
	// 	});
	// 	console.debug("[MIDDLEWARE] Waitlist status:", response.data);
	// 	if (response.data && !response.data.accessGranted) {
	// 		return NextResponse.redirect(new URL("/waitlist", request.url));
	// 	}
	// }

	console.debug("[MIDDLEWARE] Passing through to next handler")
	console.debug("[MIDDLEWARE] === MIDDLEWARE END ===")
	return NextResponse.next()
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|images|icon.png|monitoring|opengraph-image.png|ingest|api|login|api/emails).*)",
	],
}
