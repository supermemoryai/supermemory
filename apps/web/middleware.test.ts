import { beforeEach, describe, expect, it, mock } from "bun:test"

const getSession = mock()

mock.module("@lib/auth.middleware", () => ({
	middlewareAuthClient: { getSession },
}))

const { default: proxy } = await import("./middleware")

beforeEach(() => {
	getSession.mockReset()
})

describe("auth proxy", () => {
	it("rejects API requests with a forged session cookie", async () => {
		getSession.mockResolvedValue(null)

		const response = await proxy(
			new Request("https://app.supermemory.ai/api/onboarding/research", {
				headers: {
					cookie: "better-auth.session_token=forged",
				},
			}),
		)

		expect(response.status).toBe(401)
		expect(await response.json()).toEqual({ error: "Unauthorized" })
		expect(getSession).toHaveBeenCalledWith({
			fetchOptions: {
				headers: {
					cookie: "better-auth.session_token=forged",
				},
			},
		})
	})

	it("does not validate API requests without a session cookie", async () => {
		const response = await proxy(
			new Request("https://app.supermemory.ai/api/onboarding/research"),
		)

		expect(response.status).toBe(401)
		expect(getSession).not.toHaveBeenCalled()
	})

	it("redirects page requests with an expired session cookie", async () => {
		getSession.mockResolvedValue(null)

		const response = await proxy(
			new Request("https://app.supermemory.ai/settings", {
				headers: {
					cookie: "better-auth.session_token=expired",
				},
			}),
		)

		expect(response.status).toBe(307)
		expect(response.headers.get("location")).toBe(
			"https://app.supermemory.ai/login?redirect=https%3A%2F%2Fapp.supermemory.ai%2Fsettings",
		)
	})

	it("allows API requests with a valid session", async () => {
		getSession.mockResolvedValue({
			session: {},
			user: {},
		})

		const response = await proxy(
			new Request("https://app.supermemory.ai/api/onboarding/research", {
				headers: {
					cookie: "better-auth.session_token=valid",
				},
			}),
		)

		expect(response.status).toBe(200)
		expect(response.headers.get("x-middleware-next")).toBe("1")
	})

	it("fails closed when session validation is unavailable", async () => {
		getSession.mockRejectedValue(new Error("backend unavailable"))

		const response = await proxy(
			new Request("https://app.supermemory.ai/api/onboarding/research", {
				headers: {
					cookie: "better-auth.session_token=unknown",
				},
			}),
		)

		expect(response.status).toBe(401)
	})
})
