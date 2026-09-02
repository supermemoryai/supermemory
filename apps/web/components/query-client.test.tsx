import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test"
import { Window } from "happy-dom"

let currentPathname = "/brain"
let currentAuth = {
	session: { id: "session-a", activeOrganizationId: "organization-a" },
	user: { id: "user-a" },
	org: { id: "organization-a" },
	isSessionPending: false,
	isRestoring: false,
}

mock.module("@lib/auth-context", () => ({
	useAuth: () => currentAuth,
}))
mock.module("next/navigation", () => ({
	usePathname: () => currentPathname,
}))

const browserWindow = new Window({ url: "https://app.supermemory.ai" })
const installedGlobals = [
	"window",
	"document",
	"navigator",
	"Node",
	"HTMLElement",
	"Event",
	"MutationObserver",
] as const
const originalDescriptors = new Map(
	installedGlobals.map((name) => [
		name,
		Object.getOwnPropertyDescriptor(globalThis, name),
	]),
)

for (const name of installedGlobals) {
	Object.defineProperty(globalThis, name, {
		configurable: true,
		value: browserWindow[name],
	})
}
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
	configurable: true,
	value: true,
})

const [{ act, useEffect }, { createRoot }, { useQueryClient }] =
	await Promise.all([
		import("react"),
		import("react-dom/client"),
		import("@tanstack/react-query"),
	])
const { QueryProvider, ScopedQueryProvider } = await import("./query-client")

beforeEach(() => {
	currentPathname = "/brain"
	currentAuth = {
		session: { id: "session-a", activeOrganizationId: "organization-a" },
		user: { id: "user-a" },
		org: { id: "organization-a" },
		isSessionPending: false,
		isRestoring: false,
	}
})

afterAll(() => {
	for (const name of installedGlobals) {
		const descriptor = originalDescriptors.get(name)
		if (descriptor) Object.defineProperty(globalThis, name, descriptor)
		else Reflect.deleteProperty(globalThis, name)
	}
	Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT")
	void browserWindow.close()
})

describe("ScopedQueryProvider", () => {
	it("discards the mounted cache when the auth scope changes", async () => {
		const clients: ReturnType<typeof useQueryClient>[] = []
		let mounts = 0
		let unmounts = 0

		function Probe() {
			const queryClient = useQueryClient()
			clients.push(queryClient)
			useEffect(() => {
				mounts += 1
				return () => {
					unmounts += 1
				}
			}, [])
			return null
		}

		const container = document.createElement("div")
		document.body.append(container)
		const root = createRoot(container)

		await act(async () => {
			root.render(
				<ScopedQueryProvider scope="account-a">
					<Probe />
				</ScopedQueryProvider>,
			)
		})
		const accountAClient = clients.at(-1)
		expect(accountAClient).toBeDefined()
		accountAClient?.setQueryData(
			["documents", "sm_project_default"],
			[{ id: "account-a-secret" }],
		)

		await act(async () => {
			root.render(
				<ScopedQueryProvider scope="account-a">
					<Probe />
				</ScopedQueryProvider>,
			)
		})
		expect(clients.at(-1)).toBe(accountAClient)
		expect(mounts).toBe(1)
		expect(unmounts).toBe(0)

		await act(async () => {
			root.render(
				<ScopedQueryProvider scope="account-b">
					<Probe />
				</ScopedQueryProvider>,
			)
		})
		const accountBClient = clients.at(-1)
		expect(accountBClient).not.toBe(accountAClient)
		expect(accountAClient?.getQueryCache().getAll()).toHaveLength(0)
		expect(
			accountBClient?.getQueryData(["documents", "sm_project_default"]),
		).toBeUndefined()
		accountBClient?.setQueryData(
			["documents", "sm_project_default"],
			[{ id: "account-b-secret" }],
		)
		expect(mounts).toBe(2)
		expect(unmounts).toBe(1)

		await act(async () => {
			root.render(
				<ScopedQueryProvider scope="account-a">
					<Probe />
				</ScopedQueryProvider>,
			)
		})
		const accountAReturnClient = clients.at(-1)
		expect(accountAReturnClient).not.toBe(accountAClient)
		expect(accountAReturnClient).not.toBe(accountBClient)
		expect(accountBClient?.getQueryCache().getAll()).toHaveLength(0)
		expect(
			accountAReturnClient?.getQueryData(["documents", "sm_project_default"]),
		).toBeUndefined()
		expect(mounts).toBe(3)
		expect(unmounts).toBe(2)

		await act(async () => root.unmount())
		container.remove()
	})
})

describe("QueryProvider", () => {
	it("preserves consent state across org selection but not account changes", async () => {
		const clients: ReturnType<typeof useQueryClient>[] = []
		let mounts = 0

		function Probe() {
			clients.push(useQueryClient())
			useEffect(() => {
				mounts += 1
			}, [])
			return null
		}

		const container = document.createElement("div")
		document.body.append(container)
		const root = createRoot(container)
		currentPathname = "/oauth/consent"

		await act(async () => {
			root.render(
				<QueryProvider>
					<Probe />
				</QueryProvider>,
			)
		})
		const accountAClient = clients.at(-1)
		accountAClient?.setQueryData(["consent-state"], "account-a")

		currentAuth = {
			...currentAuth,
			session: {
				...currentAuth.session,
				activeOrganizationId: "organization-b",
			},
			org: { id: "organization-b" },
		}
		await act(async () => {
			root.render(
				<QueryProvider>
					<Probe />
				</QueryProvider>,
			)
		})
		expect(clients.at(-1)).toBe(accountAClient)
		expect(clients.at(-1)?.getQueryData<string>(["consent-state"])).toBe(
			"account-a",
		)
		expect(mounts).toBe(1)

		currentAuth = {
			...currentAuth,
			session: { id: "session-b", activeOrganizationId: "organization-b" },
			user: { id: "user-b" },
		}
		await act(async () => {
			root.render(
				<QueryProvider>
					<Probe />
				</QueryProvider>,
			)
		})
		expect(clients.at(-1)).not.toBe(accountAClient)
		expect(clients.at(-1)?.getQueryData(["consent-state"])).toBeUndefined()
		expect(mounts).toBe(2)

		await act(async () => root.unmount())
		container.remove()
	})

	it("still rotates organization-scoped caches outside consent", async () => {
		const clients: ReturnType<typeof useQueryClient>[] = []

		function Probe() {
			clients.push(useQueryClient())
			return null
		}

		const container = document.createElement("div")
		document.body.append(container)
		const root = createRoot(container)
		await act(async () => {
			root.render(
				<QueryProvider>
					<Probe />
				</QueryProvider>,
			)
		})
		const organizationAClient = clients.at(-1)

		currentAuth = {
			...currentAuth,
			session: {
				...currentAuth.session,
				activeOrganizationId: "organization-b",
			},
			org: { id: "organization-b" },
		}
		await act(async () => {
			root.render(
				<QueryProvider>
					<Probe />
				</QueryProvider>,
			)
		})
		expect(clients.at(-1)).not.toBe(organizationAClient)

		await act(async () => root.unmount())
		container.remove()
	})
})
