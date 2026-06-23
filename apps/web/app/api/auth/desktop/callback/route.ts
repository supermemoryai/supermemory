import { NextResponse, type NextRequest } from "next/server"

const DEFAULT_API_URL =
	process.env.NEXT_PUBLIC_BACKEND_URL ?? "https://api.supermemory.ai"

function isValidDesktopCallback(callback: string): boolean {
	try {
		const url = new URL(callback)
		const isLoopback =
			(url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
			url.protocol === "http:" &&
			url.pathname === "/callback" &&
			url.searchParams.has("state")
		if (isLoopback) return true

		return (
			url.protocol === "supermemory:" &&
			url.hostname === "auth-callback" &&
			url.searchParams.has("state")
		)
	} catch {
		return false
	}
}

function isValidApiUrl(apiUrl: string): boolean {
	try {
		const url = new URL(apiUrl)
		return url.protocol === "http:" || url.protocol === "https:"
	} catch {
		return false
	}
}

function redirectToCallback(callback: string, params: Record<string, string>) {
	const redirectUrl = new URL(callback)
	for (const [key, value] of Object.entries(params)) {
		redirectUrl.searchParams.set(key, value)
	}
	return NextResponse.redirect(redirectUrl)
}

export async function GET(request: NextRequest) {
	const url = new URL(request.url)
	const callback = url.searchParams.get("callback")
	if (!callback || !isValidDesktopCallback(callback)) {
		return NextResponse.json(
			{ message: "Invalid desktop callback URL" },
			{ status: 400 },
		)
	}

	if (url.searchParams.has("error")) {
		return redirectToCallback(callback, {
			error: url.searchParams.get("error") || "auth_failed",
		})
	}

	const apiUrl = url.searchParams.get("api_url") || DEFAULT_API_URL
	if (!isValidApiUrl(apiUrl)) {
		return redirectToCallback(callback, { error: "invalid_api_url" })
	}

	const cookie = request.headers.get("cookie")
	if (!cookie) {
		return redirectToCallback(callback, { error: "missing_session" })
	}

	const deviceInfo = {
		hostname: url.searchParams.get("hostname") || "Supermemory Desktop",
		os: url.searchParams.get("os") || "desktop",
		cwd: url.searchParams.get("cwd") || "",
		cliVersion: url.searchParams.get("version") || "desktop",
	}

	try {
		const res = await fetch(`${apiUrl.replace(/\/+$/, "")}/v3/auth/agent-key`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Cookie: cookie,
				"X-App-Source": "desktop",
			},
			body: JSON.stringify({
				name: "Supermemory Desktop",
				permission: "write",
				deviceInfo,
			}),
		})

		if (!res.ok) {
			const data = (await res.json().catch(() => ({}))) as {
				message?: string
			}
			return redirectToCallback(callback, {
				error: data.message ?? "desktop_key_failed",
			})
		}

		const data = (await res.json()) as { key?: string }
		if (!data.key) {
			return redirectToCallback(callback, { error: "missing_desktop_key" })
		}

		return redirectToCallback(callback, {
			apikey: data.key,
			api_url: apiUrl,
		})
	} catch (err) {
		return redirectToCallback(callback, {
			error:
				err instanceof Error ? err.message : "desktop_auth_callback_failed",
		})
	}
}
