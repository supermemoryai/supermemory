import { describe, expect, it, vi } from "vitest"
import type { SessionInfo } from "../shared/types"
import { fetchSession } from "./auth"
import { activeNamespaceFor, defaultNamespaceFor } from "./connection-access"

vi.mock("./auth", () => ({ fetchSession: vi.fn() }))

const fetchSessionMock = vi.mocked(fetchSession)
const API_URL = "https://api.test"

// The access lookup is cached per token, so every test uses its own.
let tokenCount = 0
const nextToken = () => `sm_test_token_${++tokenCount}`

const full: SessionInfo = {
	user: { id: "user_test" },
	accessType: "full",
	scope: { type: "full", permission: "write" },
}

const scopedTo = (...tags: string[]): SessionInfo => ({
	...full,
	scope: { type: "scoped", permission: "write", tags },
})

describe("activeNamespaceFor", () => {
	it("returns nothing, without a session lookup, when no space is stored", async () => {
		fetchSessionMock.mockClear()

		expect(
			await activeNamespaceFor(undefined, nextToken(), API_URL),
		).toBeUndefined()
		expect(fetchSessionMock).not.toHaveBeenCalled()
	})

	it("keeps the stored space for a full-access connection", async () => {
		fetchSessionMock.mockResolvedValueOnce(full)

		expect(await activeNamespaceFor("personal", nextToken(), API_URL)).toBe(
			"personal",
		)
	})

	it("keeps a stored space inside the connection's scope", async () => {
		fetchSessionMock.mockResolvedValueOnce(scopedTo("work", "docs"))

		expect(await activeNamespaceFor("docs", nextToken(), API_URL)).toBe("docs")
	})

	it("ignores a stored space a scoped connection cannot use", async () => {
		// Another connection of the same user (say Claude Code) picked "personal".
		fetchSessionMock.mockResolvedValueOnce(scopedTo("work"))
		const token = nextToken()

		expect(await activeNamespaceFor("personal", token, API_URL)).toBeUndefined()
		expect(await defaultNamespaceFor(token, API_URL)).toBe("work")
	})

	it("ignores a stored space a restricted member lost access to", async () => {
		fetchSessionMock.mockResolvedValueOnce({
			...full,
			accessType: "restricted",
			namespaces: [{ namespace: "work", permission: "write" }],
		})

		expect(
			await activeNamespaceFor("personal", nextToken(), API_URL),
		).toBeUndefined()
	})

	it("keeps the stored space when the session lookup fails", async () => {
		fetchSessionMock.mockRejectedValueOnce(new Error("session unavailable"))

		expect(await activeNamespaceFor("personal", nextToken(), API_URL)).toBe(
			"personal",
		)
	})

	it("looks the session up once per token for the active and default space", async () => {
		fetchSessionMock.mockClear()
		fetchSessionMock.mockResolvedValue(scopedTo("work"))
		const token = nextToken()

		await activeNamespaceFor("work", token, API_URL)
		await activeNamespaceFor("personal", token, API_URL)
		await defaultNamespaceFor(token, API_URL)

		expect(fetchSessionMock).toHaveBeenCalledTimes(1)
	})
})
