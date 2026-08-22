import { afterEach, describe, expect, it, mock } from "bun:test"
import { hasVerifiedSession } from "./server-session"

const originalFetch = globalThis.fetch

afterEach(() => {
	globalThis.fetch = originalFetch
})

function requestWithCookie(cookie?: string): Request {
	const headers = new Headers()
	if (cookie) headers.set("cookie", cookie)
	return new Request("https://app.supermemory.ai/api/og", { headers })
}

describe("hasVerifiedSession", () => {
	it("returns false without any cookie header", async () => {
		const fetchMock = mock(() => Promise.reject(new Error("must not fetch")))
		globalThis.fetch = fetchMock as unknown as typeof fetch
		expect(await hasVerifiedSession(requestWithCookie())).toBe(false)
	})

	it("returns false when the backend rejects the session", async () => {
		const fetchMock = mock(() =>
			Promise.resolve(new Response(null, { status: 401 })),
		)
		globalThis.fetch = fetchMock as unknown as typeof fetch
		expect(
			await hasVerifiedSession(
				requestWithCookie("better-auth.session_token=x"),
			),
		).toBe(false)
	})

	it("returns false when the backend returns no user", async () => {
		const fetchMock = mock(() =>
			Promise.resolve(Response.json(null, { status: 200 })),
		)
		globalThis.fetch = fetchMock as unknown as typeof fetch
		expect(
			await hasVerifiedSession(
				requestWithCookie("better-auth.session_token=x"),
			),
		).toBe(false)
	})

	it("forwards cookies and returns true for a live session", async () => {
		let seenCookie = ""
		const fetchMock = mock((_: unknown, init?: RequestInit) => {
			seenCookie = String(new Headers(init?.headers).get("cookie"))
			return Promise.resolve(
				Response.json({ user: { id: "u1" }, session: { id: "s1" } }),
			)
		})
		globalThis.fetch = fetchMock as unknown as typeof fetch
		const ok = await hasVerifiedSession(
			requestWithCookie("better-auth.session_token=live-token"),
		)
		expect(ok).toBe(true)
		expect(seenCookie).toBe("better-auth.session_token=live-token")
	})

	it("fails closed when the backend is unreachable", async () => {
		const fetchMock = mock(() => Promise.reject(new Error("down")))
		globalThis.fetch = fetchMock as unknown as typeof fetch
		expect(
			await hasVerifiedSession(
				requestWithCookie("better-auth.session_token=x"),
			),
		).toBe(false)
	})
})
