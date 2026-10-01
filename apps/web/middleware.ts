import { type NextRequest, NextResponse } from "next/server"
import { consoleOrigin } from "./console-origin"

const RENAMED_PATHS = new Map([
	["/auth/connect", "/auth/connect"],
	["/auth/agent-connect", "/auth/connect"],
])

const SAME_PATHS = ["/login", "/oauth/consent", "/org/invite/"]

// Machine callers (plugins, OAuth clients, invites) get an instant 308 with the query intact; humans get the notice page.
export default function proxy(request: NextRequest) {
	const url = request.nextUrl
	const forwarded =
		process.env.NODE_ENV !== "production"
			? request.headers.get("x-forwarded-host")
			: null
	const console = consoleOrigin(forwarded ?? url.hostname, url.protocol)

	const renamed = RENAMED_PATHS.get(url.pathname)
	const same = SAME_PATHS.some(
		(p) => url.pathname === p || url.pathname.startsWith(p),
	)
	const target = renamed ?? (same ? url.pathname : null)
	if (target) {
		return NextResponse.redirect(`${console}${target}${url.search}`, 308)
	}

	if (url.pathname !== "/") {
		return NextResponse.rewrite(new URL("/", url))
	}
	return NextResponse.next()
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|favicon-16x16.png|favicon-32x32.png|apple-touch-icon.png|android-chrome-192x192.png|android-chrome-512x512.png|site.webmanifest|OG.png|logo-fullmark.svg|logo-light-fullmark.svg|icon.png|opengraph-image.png).*)",
	],
}
