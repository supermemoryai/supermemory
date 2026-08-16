import { afterEach, beforeAll, describe, expect, it, mock } from "bun:test"
import { Window } from "happy-dom"
import { act, cleanup, renderHook, waitFor } from "@testing-library/react"

type AuthState = {
	isSessionPending: boolean
	isRestoring: boolean
	session: { userId: string; activeOrganizationId: string } | null
	user: { id: string } | null
	org: { id: string } | null
}

type SearchResponse = {
	data: {
		results: Array<{ title: string; summary: string; chunks: never[] }>
	}
}

const search = mock(
	(): Promise<SearchResponse> => Promise.resolve({ data: { results: [] } }),
)
let auth: AuthState

mock.module("@lib/api", () => ({ $fetch: search }))
mock.module("@lib/auth-context", () => ({ useAuth: () => auth }))

let usePersonalization: typeof import("./use-personalization").usePersonalization
let clearPersonalizationCache: typeof import("./use-personalization").clearPersonalizationCache

function settledAuth(userId: string, orgId: string): AuthState {
	return {
		isSessionPending: false,
		isRestoring: false,
		session: { userId, activeOrganizationId: orgId },
		user: { id: userId },
		org: { id: orgId },
	}
}

function cacheKey(userId: string, orgId: string) {
	return `sm_profession_v2:u:${encodeURIComponent(userId)}:o:${encodeURIComponent(orgId)}`
}

function cacheProfession(userId: string, orgId: string, profession: string) {
	localStorage.setItem(
		cacheKey(userId, orgId),
		JSON.stringify({ profession, ts: Date.now() }),
	)
}

function searchResponse(keyword: string): SearchResponse {
	return {
		data: {
			results: [{ title: keyword, summary: "", chunks: [] }],
		},
	}
}

function deferred<T>() {
	let resolve!: (value: T) => void
	const promise = new Promise<T>((done) => {
		resolve = done
	})
	return { promise, resolve }
}

beforeAll(async () => {
	const window = new Window({ url: "https://app.supermemory.ai" })
	Object.defineProperties(globalThis, {
		window: { configurable: true, value: window },
		document: { configurable: true, value: window.document },
		localStorage: { configurable: true, value: window.localStorage },
		navigator: { configurable: true, value: window.navigator },
		HTMLElement: { configurable: true, value: window.HTMLElement },
		Node: { configurable: true, value: window.Node },
	})
	;(
		globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
	).IS_REACT_ACT_ENVIRONMENT = true
	;({ usePersonalization, clearPersonalizationCache } = await import(
		"./use-personalization"
	))
})

afterEach(() => {
	cleanup()
	localStorage.clear()
	search.mockReset()
})

describe("usePersonalization auth scoping", () => {
	it("does not reuse account A's cache for account B", async () => {
		auth = settledAuth("user-a", "shared-org")
		cacheProfession("user-a", "shared-org", "developer")
		search.mockResolvedValue(searchResponse("finance portfolio"))
		const { result, rerender } = renderHook(() => usePersonalization())

		await waitFor(() => expect(result.current.profession).toBe("developer"))
		expect(search).not.toHaveBeenCalled()

		auth = {
			...settledAuth("user-b", "shared-org"),
			isSessionPending: true,
		}
		rerender()
		expect(result.current.profession).toBe("default")
		expect(search).not.toHaveBeenCalled()

		auth = settledAuth("user-b", "shared-org")
		rerender()
		expect(result.current.profession).toBe("default")
		await waitFor(() => expect(result.current.profession).toBe("finance"))
		expect(search).toHaveBeenCalledTimes(1)
	})

	it("resets to defaults without searching after logout", async () => {
		auth = settledAuth("logout-user", "logout-org")
		cacheProfession("logout-user", "logout-org", "developer")
		const { result, rerender } = renderHook(() => usePersonalization())
		await waitFor(() => expect(result.current.profession).toBe("developer"))

		auth = {
			isSessionPending: false,
			isRestoring: false,
			session: null,
			user: null,
			org: null,
		}
		rerender()

		expect(result.current.profession).toBe("default")
		expect(search).not.toHaveBeenCalled()
	})

	it("ignores account A's late result after switching to account B", async () => {
		const accountA = deferred<ReturnType<typeof searchResponse>>()
		const accountB = deferred<ReturnType<typeof searchResponse>>()
		search
			.mockImplementationOnce(() => accountA.promise)
			.mockImplementationOnce(() => accountB.promise)
		auth = settledAuth("deferred-a", "shared-org")
		const { result, rerender } = renderHook(() => usePersonalization())
		await waitFor(() => expect(search).toHaveBeenCalledTimes(1))

		auth = settledAuth("deferred-b", "shared-org")
		rerender()
		expect(result.current.profession).toBe("default")
		await waitFor(() => expect(search).toHaveBeenCalledTimes(2))

		await act(async () => accountB.resolve(searchResponse("medical clinical")))
		await waitFor(() => expect(result.current.profession).toBe("medical"))
		await act(async () =>
			accountA.resolve(searchResponse("software developer")),
		)
		expect(result.current.profession).toBe("medical")
		expect(
			JSON.parse(
				localStorage.getItem(cacheKey("deferred-b", "shared-org")) ?? "{}",
			).profession,
		).toBe("medical")
		expect(
			localStorage.getItem(cacheKey("deferred-a", "shared-org")),
		).toBeNull()
	})

	it("keeps a manual choice when an older detection resolves", async () => {
		const pendingDetection = deferred<ReturnType<typeof searchResponse>>()
		search.mockImplementationOnce(() => pendingDetection.promise)
		auth = settledAuth("manual-race-user", "manual-race-org")
		const { result } = renderHook(() => usePersonalization())
		await waitFor(() => expect(search).toHaveBeenCalledTimes(1))

		act(() => result.current.setProfession("marketing"))
		expect(result.current.profession).toBe("marketing")
		expect(
			JSON.parse(
				localStorage.getItem(cacheKey("manual-race-user", "manual-race-org")) ??
					"{}",
			).profession,
		).toBe("marketing")

		await act(async () =>
			pendingDetection.resolve(searchResponse("software developer")),
		)

		expect(result.current.profession).toBe("marketing")
		expect(
			JSON.parse(
				localStorage.getItem(cacheKey("manual-race-user", "manual-race-org")) ??
					"{}",
			).profession,
		).toBe("marketing")
	})

	it("uses a fresh cache for the same account and org without searching", async () => {
		auth = settledAuth("cached-user", "cached-org")
		cacheProfession("cached-user", "cached-org", "research")
		const { result } = renderHook(() => usePersonalization())

		await waitFor(() => expect(result.current.profession).toBe("research"))
		expect(search).not.toHaveBeenCalled()
	})

	it("writes manual profession changes only to the active scope", async () => {
		auth = settledAuth("manual-user", "org-one")
		cacheProfession("manual-user", "org-one", "developer")
		cacheProfession("manual-user", "org-two", "finance")
		const { result, rerender } = renderHook(() => usePersonalization())
		await waitFor(() => expect(result.current.profession).toBe("developer"))

		act(() => result.current.setProfession("marketing"))
		expect(
			JSON.parse(
				localStorage.getItem(cacheKey("manual-user", "org-one")) ?? "{}",
			).profession,
		).toBe("marketing")

		auth = settledAuth("manual-user", "org-two")
		rerender()
		await waitFor(() => expect(result.current.profession).toBe("finance"))
		act(() => result.current.setProfession("medical"))

		expect(
			JSON.parse(
				localStorage.getItem(cacheKey("manual-user", "org-one")) ?? "{}",
			).profession,
		).toBe("marketing")
		expect(
			JSON.parse(
				localStorage.getItem(cacheKey("manual-user", "org-two")) ?? "{}",
			).profession,
		).toBe("medical")
		expect(search).not.toHaveBeenCalled()
	})

	it("waits for an org switch to settle before reading or searching", async () => {
		auth = settledAuth("org-user", "org-one")
		cacheProfession("org-user", "org-one", "legal")
		search.mockResolvedValue(searchResponse("figma product design"))
		const { result, rerender } = renderHook(() => usePersonalization())
		await waitFor(() => expect(result.current.profession).toBe("legal"))

		auth = { ...auth, org: { id: "org-two" } }
		rerender()
		expect(result.current.profession).toBe("default")
		expect(search).not.toHaveBeenCalled()

		auth = settledAuth("org-user", "org-two")
		rerender()
		await waitFor(() => expect(result.current.profession).toBe("design"))
		expect(search).toHaveBeenCalledTimes(1)
	})

	it("does not read the unscoped v1 cache", async () => {
		auth = settledAuth("legacy-user", "legacy-org")
		localStorage.setItem(
			"sm_profession_v1",
			JSON.stringify({ profession: "developer", ts: Date.now() }),
		)
		search.mockResolvedValue(searchResponse("finance investment"))
		const { result } = renderHook(() => usePersonalization())

		await waitFor(() => expect(result.current.profession).toBe("finance"))
		expect(search).toHaveBeenCalledTimes(1)
		expect(localStorage.getItem("sm_profession_v1")).toBeNull()
	})

	it("ignores inherited-property profession values in a scoped cache", async () => {
		auth = settledAuth("malformed-user", "malformed-org")
		cacheProfession("malformed-user", "malformed-org", "toString")
		search.mockResolvedValue(searchResponse("finance investment"))
		const { result } = renderHook(() => usePersonalization())

		await waitFor(() => expect(result.current.profession).toBe("finance"))
		expect(search).toHaveBeenCalledTimes(1)
	})

	it("clears every personalization cache without touching unrelated storage", () => {
		localStorage.setItem("sm_profession_v1", "legacy")
		localStorage.setItem(cacheKey("clear-a", "org-a"), "a")
		localStorage.setItem(cacheKey("clear-b", "org-b"), "b")
		localStorage.setItem("unrelated", "keep")

		clearPersonalizationCache()

		expect(localStorage.getItem("sm_profession_v1")).toBeNull()
		expect(localStorage.getItem(cacheKey("clear-a", "org-a"))).toBeNull()
		expect(localStorage.getItem(cacheKey("clear-b", "org-b"))).toBeNull()
		expect(localStorage.getItem("unrelated")).toBe("keep")
	})
})
