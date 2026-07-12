import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import {
	getExtensionAuthCredentials,
	getSessionToken,
	isExtensionAuthUrl,
} from "./extension-auth"

describe("extension auth", () => {
	it("accepts only flagged Supermemory auth pages", () => {
		expect(
			isExtensionAuthUrl(
				"https://app.supermemory.ai/?extension-auth-success=true",
			),
		).toBe(true)
		expect(
			isExtensionAuthUrl("http://localhost:3000/?extension-auth-success=true"),
		).toBe(true)
		expect(isExtensionAuthUrl("https://app.supermemory.ai/")).toBe(false)
		expect(
			isExtensionAuthUrl(
				"https://app.supermemory.ai.evil.example/?extension-auth-success=true",
			),
		).toBe(false)
		expect(
			isExtensionAuthUrl(
				"http://app.supermemory.ai/?extension-auth-success=true",
			),
		).toBe(false)
	})

	it("finds production and development Better Auth cookies", () => {
		expect(
			getSessionToken([
				{ name: "__Secure-better-auth.session_token", value: "production" },
			]),
		).toBe("production")
		expect(
			getSessionToken([
				{ name: "better-auth-dev.session_token", value: "development" },
			]),
		).toBe("development")
		expect(getSessionToken([{ name: "unrelated", value: "token" }])).toBeNull()
	})

	it("validates the cookie before returning credentials", async () => {
		const requests: Array<{ url: string; authorization: string | null }> = []
		const fetchSession = async (
			input: string | URL | Request,
			init?: RequestInit,
		) => {
			const headers = new Headers(init?.headers)
			requests.push({
				url: input.toString(),
				authorization: headers.get("authorization"),
			})
			return Response.json({
				user: {
					id: "user-1",
					email: "user@example.com",
					name: "Test User",
				},
			})
		}

		const credentials = await getExtensionAuthCredentials(
			"https://app.supermemory.ai/?extension-auth-success=true",
			[{ name: "better-auth.session_token", value: "session-token" }],
			"https://api.supermemory.ai",
			fetchSession,
		)

		expect(requests).toEqual([
			{
				url: "https://api.supermemory.ai/v3/session",
				authorization: "Bearer session-token",
			},
		])
		expect(credentials).toEqual({
			token: "session-token",
			user: {
				userId: "user-1",
				email: "user@example.com",
				name: "Test User",
			},
		})
	})

	it("rejects untrusted callers and invalid sessions", async () => {
		const validResponse = async () => Response.json({ user: { id: "user-1" } })
		const invalidResponse = async () => new Response(null, { status: 401 })

		await expect(
			getExtensionAuthCredentials(
				"https://evil.example/?extension-auth-success=true",
				[{ name: "better-auth.session_token", value: "session-token" }],
				"https://api.supermemory.ai",
				validResponse,
			),
		).rejects.toThrow("Extension auth is not allowed from this page")
		await expect(
			getExtensionAuthCredentials(
				"https://app.supermemory.ai/?extension-auth-success=true",
				[{ name: "better-auth.session_token", value: "session-token" }],
				"https://api.supermemory.ai",
				invalidResponse,
			),
		).rejects.toThrow("Session validation failed")
	})

	it("does not publish credentials through the page message bus", () => {
		const appExperience = readFileSync(
			new URL("../../web/components/app-experience.tsx", import.meta.url),
			"utf8",
		)
		expect(appExperience).not.toContain("window.postMessage")
		expect(appExperience).not.toContain("session?.token")
	})
})
