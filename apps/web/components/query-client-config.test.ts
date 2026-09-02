import { describe, expect, it } from "bun:test"
import {
	createQueryCacheScope,
	createQueryClient,
	createRouteAwareQueryCacheScope,
	shouldScopeQueriesByOrganization,
	type QueryCacheScope,
} from "./query-client-config"

const baseScope: QueryCacheScope = {
	isSessionPending: false,
	isRestoring: false,
	sessionId: "session-a",
	userId: "user-a",
	activeOrganizationId: "organization-a",
	organizationId: "organization-a",
}

describe("createQueryCacheScope", () => {
	it("is stable while the authentication scope is unchanged", () => {
		expect(createQueryCacheScope(baseScope)).toBe(
			createQueryCacheScope({ ...baseScope }),
		)
	})

	it.each([
		["session", { sessionId: "session-b" }],
		["user", { userId: "user-b" }],
		["server organization", { activeOrganizationId: "organization-b" }],
		["resolved organization", { organizationId: "organization-b" }],
		["pending session", { isSessionPending: true }],
		["restoring organization", { isRestoring: true }],
		[
			"logout with a stale organization",
			{ sessionId: null, userId: null, activeOrganizationId: null },
		],
	] satisfies Array<
		[string, Partial<QueryCacheScope>]
	>)("changes when the %s boundary changes", (_name, change) => {
		expect(createQueryCacheScope({ ...baseScope, ...change })).not.toBe(
			createQueryCacheScope(baseScope),
		)
	})

	it("does not collide when identifiers contain delimiters", () => {
		const first = createQueryCacheScope({
			...baseScope,
			sessionId: "session|user",
			userId: "organization",
		})
		const second = createQueryCacheScope({
			...baseScope,
			sessionId: "session",
			userId: "user|organization",
		})

		expect(first).not.toBe(second)
	})

	it("keeps OAuth consent mounted while the selected organization changes", () => {
		expect(createRouteAwareQueryCacheScope(baseScope, "/oauth/consent")).toBe(
			createRouteAwareQueryCacheScope(
				{
					...baseScope,
					activeOrganizationId: "organization-b",
					organizationId: "organization-b",
				},
				"/oauth/consent",
			),
		)
		expect(
			createRouteAwareQueryCacheScope(
				{ ...baseScope, sessionId: "session-b", userId: "user-b" },
				"/oauth/consent",
			),
		).not.toBe(createRouteAwareQueryCacheScope(baseScope, "/oauth/consent"))
	})

	it("scopes organization caches everywhere except OAuth consent", () => {
		expect(shouldScopeQueriesByOrganization("/oauth/consent")).toBe(false)
		expect(shouldScopeQueriesByOrganization("/oauth/consent/")).toBe(false)
		expect(shouldScopeQueriesByOrganization("/brain")).toBe(true)
		expect(shouldScopeQueriesByOrganization("/settings")).toBe(true)
	})
})

describe("createQueryClient", () => {
	it("does not share tenant data between clients", async () => {
		const queryKey = ["documents", "sm_project_default"] as const
		const accountAClient = createQueryClient()
		const accountBClient = createQueryClient()
		let accountBFetches = 0

		accountAClient.setQueryData(queryKey, [{ id: "account-a-secret" }])

		expect(accountBClient.getQueryData(queryKey)).toBeUndefined()
		await expect(
			accountBClient.fetchQuery({
				queryKey,
				queryFn: () => {
					accountBFetches += 1
					return [{ id: "account-b-document" }]
				},
			}),
		).resolves.toEqual([{ id: "account-b-document" }])
		expect(accountBFetches).toBe(1)

		accountAClient.clear()
		accountBClient.clear()
	})

	it("preserves the existing query defaults", () => {
		const queryClient = createQueryClient()

		expect(queryClient.getDefaultOptions().queries).toMatchObject({
			refetchIntervalInBackground: false,
			refetchOnWindowFocus: false,
			staleTime: 60 * 1000,
		})
		queryClient.clear()
	})
})
