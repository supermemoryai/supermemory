import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
} from "bun:test"
import { Window } from "happy-dom"

type TestOrganization = {
	id: string
	name: string
	slug: string
	createdAt: Date
}

type TestSession = {
	session: {
		id: string
		activeOrganizationId: string | null
	}
	user: {
		id: string
	}
}

type OrganizationListResult = {
	data: TestOrganization[]
	error: null
}

const browserWindow = new Window({ url: "https://app.supermemory.ai" })
const installedGlobals = [
	"window",
	"document",
	"navigator",
	"Node",
	"HTMLElement",
	"Event",
	"MutationObserver",
	"localStorage",
] as const
const originalDescriptors = new Map(
	installedGlobals.map((name) => [
		name,
		Object.getOwnPropertyDescriptor(globalThis, name),
	]),
)
const originalActEnvironmentDescriptor = Object.getOwnPropertyDescriptor(
	globalThis,
	"IS_REACT_ACT_ENVIRONMENT",
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

let currentSession: TestSession | null = null
let isSessionPending = false
let listRequests: Array<{
	resolve: (result: OrganizationListResult) => void
	reject: (error: Error) => void
}> = []
let legacyOrganizations: TestOrganization[] = []

const organizationById = new Map<string, TestOrganization>()

mock.module("./auth", () => ({
	authClient: {
		useListOrganizations: () => ({
			data: legacyOrganizations,
			isPending: false,
			refetch: async () => ({ data: legacyOrganizations, error: null }),
		}),
		organization: {
			list: () =>
				new Promise<OrganizationListResult>((resolve, reject) => {
					listRequests.push({ resolve, reject })
				}),
			getFullOrganization: async () => ({
				data:
					organizationById.get(
						currentSession?.session.activeOrganizationId ?? "",
					) ?? null,
				error: null,
			}),
			setActive: async () => ({ data: null, error: null }),
		},
	},
	useSession: () => ({
		data: currentSession,
		isPending: isSessionPending,
	}),
}))

const [{ act }, { createRoot }, { AuthProvider, useAuth }] = await Promise.all([
	import("react"),
	import("react-dom/client"),
	import("./auth-context"),
])
const mountedRoots: Array<ReturnType<typeof createRoot>> = []
const mountedContainers: HTMLElement[] = []

const accountAOrganization: TestOrganization = {
	id: "organization-a",
	name: "Private Account A",
	slug: "account-a",
	createdAt: new Date("2026-01-01T00:00:00Z"),
}
const accountBOrganization: TestOrganization = {
	id: "organization-b",
	name: "Private Account B",
	slug: "account-b",
	createdAt: new Date("2026-01-02T00:00:00Z"),
}

function sessionFor(
	sessionId: string,
	userId: string,
	organizationId: string,
): TestSession {
	return {
		session: { id: sessionId, activeOrganizationId: organizationId },
		user: { id: userId },
	}
}

beforeEach(() => {
	currentSession = null
	isSessionPending = false
	listRequests = []
	legacyOrganizations = []
	organizationById.clear()
	organizationById.set(accountAOrganization.id, accountAOrganization)
	organizationById.set(accountBOrganization.id, accountBOrganization)
	localStorage.clear()
})

afterEach(async () => {
	await act(async () => {
		for (const root of mountedRoots.splice(0)) root.unmount()
	})
	for (const container of mountedContainers.splice(0)) container.remove()
})

afterAll(() => {
	for (const name of installedGlobals) {
		const descriptor = originalDescriptors.get(name)
		if (descriptor) Object.defineProperty(globalThis, name, descriptor)
		else Reflect.deleteProperty(globalThis, name)
	}
	if (originalActEnvironmentDescriptor) {
		Object.defineProperty(
			globalThis,
			"IS_REACT_ACT_ENVIRONMENT",
			originalActEnvironmentDescriptor,
		)
	} else {
		Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT")
	}
	void browserWindow.close()
})

describe("AuthProvider organization scoping", () => {
	it("keeps a cold session in the restoring state until auth resolves", async () => {
		const snapshots: Array<{
			sessionId: string | null
			organizationIds: string[] | null
			isRestoring: boolean
		}> = []

		function Probe() {
			const { session, organizations, isRestoring } = useAuth()
			snapshots.push({
				sessionId: session?.id ?? null,
				organizationIds: organizations?.map(({ id }) => id) ?? null,
				isRestoring,
			})
			return null
		}

		const container = document.createElement("div")
		document.body.append(container)
		const root = createRoot(container)
		mountedContainers.push(container)
		mountedRoots.push(root)
		isSessionPending = true

		await act(async () => {
			root.render(
				<AuthProvider>
					<Probe />
				</AuthProvider>,
			)
		})
		expect(snapshots.at(-1)).toEqual({
			sessionId: null,
			organizationIds: null,
			isRestoring: true,
		})
		expect(listRequests).toHaveLength(0)

		currentSession = sessionFor("session-a", "user-a", accountAOrganization.id)
		isSessionPending = false
		await act(async () => {
			root.render(
				<AuthProvider>
					<Probe />
				</AuthProvider>,
			)
		})
		expect(snapshots.at(-1)).toEqual({
			sessionId: "session-a",
			organizationIds: null,
			isRestoring: true,
		})
		expect(listRequests).toHaveLength(1)
	})

	it("finishes restoring when the organization request rejects", async () => {
		const snapshots: Array<{
			organizationIds: string[] | null
			activeOrganizationId: string | null
			isRestoring: boolean
		}> = []

		function Probe() {
			const { organizations, org, isRestoring } = useAuth()
			snapshots.push({
				organizationIds: organizations?.map(({ id }) => id) ?? null,
				activeOrganizationId: org?.id ?? null,
				isRestoring,
			})
			return null
		}

		const container = document.createElement("div")
		document.body.append(container)
		const root = createRoot(container)
		mountedContainers.push(container)
		mountedRoots.push(root)
		currentSession = sessionFor("session-a", "user-a", accountAOrganization.id)

		await act(async () => {
			root.render(
				<AuthProvider>
					<Probe />
				</AuthProvider>,
			)
		})
		expect(listRequests).toHaveLength(1)

		await act(async () => {
			listRequests[0]?.reject(new Error("offline"))
			await Promise.resolve()
		})
		expect(snapshots.at(-1)).toEqual({
			organizationIds: [],
			activeOrganizationId: null,
			isRestoring: false,
		})
	})

	it("does not let an older same-session list replace a newer refetch", async () => {
		const observedOrganizationIds: Array<string[] | null> = []
		let refetchOrganizations: (() => Promise<unknown>) | null = null

		function Probe() {
			const auth = useAuth()
			refetchOrganizations = auth.refetchOrganizations
			observedOrganizationIds.push(
				auth.organizations?.map(({ id }) => id) ?? null,
			)
			return null
		}

		const container = document.createElement("div")
		document.body.append(container)
		const root = createRoot(container)
		mountedContainers.push(container)
		mountedRoots.push(root)
		currentSession = sessionFor("session-a", "user-a", accountAOrganization.id)

		await act(async () => {
			root.render(
				<AuthProvider>
					<Probe />
				</AuthProvider>,
			)
		})
		expect(listRequests).toHaveLength(1)
		await act(async () => {
			void refetchOrganizations?.()
			await Promise.resolve()
		})
		expect(listRequests).toHaveLength(2)

		await act(async () => {
			listRequests[1]?.resolve({
				data: [accountAOrganization, accountBOrganization],
				error: null,
			})
			await Promise.resolve()
		})
		expect(observedOrganizationIds.at(-1)).toEqual([
			accountAOrganization.id,
			accountBOrganization.id,
		])

		await act(async () => {
			listRequests[0]?.resolve({ data: [accountAOrganization], error: null })
			await Promise.resolve()
		})
		expect(observedOrganizationIds.at(-1)).toEqual([
			accountAOrganization.id,
			accountBOrganization.id,
		])
	})

	it("hides account A before account B's organizations load", async () => {
		const snapshots: Array<{
			organizationIds: string[] | null
			activeOrganizationId: string | null
			isRestoring: boolean
		}> = []

		function Probe() {
			const { organizations, org, isRestoring } = useAuth()
			snapshots.push({
				organizationIds: organizations?.map(({ id }) => id) ?? null,
				activeOrganizationId: org?.id ?? null,
				isRestoring,
			})
			return null
		}

		const container = document.createElement("div")
		document.body.append(container)
		const root = createRoot(container)
		mountedContainers.push(container)
		mountedRoots.push(root)
		legacyOrganizations = [accountAOrganization]
		currentSession = sessionFor("session-a", "user-a", accountAOrganization.id)

		await act(async () => {
			root.render(
				<AuthProvider>
					<Probe />
				</AuthProvider>,
			)
		})
		await act(async () => {
			listRequests[0]?.resolve({ data: [accountAOrganization], error: null })
			await Promise.resolve()
		})
		expect(snapshots.at(-1)).toEqual({
			organizationIds: [accountAOrganization.id],
			activeOrganizationId: accountAOrganization.id,
			isRestoring: false,
		})

		currentSession = sessionFor("session-b", "user-b", accountBOrganization.id)
		await act(async () => {
			root.render(
				<AuthProvider>
					<Probe />
				</AuthProvider>,
			)
		})

		expect(snapshots.at(-1)).toEqual({
			organizationIds: null,
			activeOrganizationId: null,
			isRestoring: true,
		})
		expect(listRequests).toHaveLength(2)

		await act(async () => {
			listRequests[1]?.resolve({ data: [accountBOrganization], error: null })
			await Promise.resolve()
		})
		expect(snapshots.at(-1)).toEqual({
			organizationIds: [accountBOrganization.id],
			activeOrganizationId: accountBOrganization.id,
			isRestoring: false,
		})
	})

	it("ignores a late organization response from the previous account", async () => {
		const observedOrganizationIds: Array<string[] | null> = []

		function Probe() {
			observedOrganizationIds.push(
				useAuth().organizations?.map(({ id }) => id) ?? null,
			)
			return null
		}

		const container = document.createElement("div")
		document.body.append(container)
		const root = createRoot(container)
		mountedContainers.push(container)
		mountedRoots.push(root)
		currentSession = sessionFor("session-a", "user-a", accountAOrganization.id)
		await act(async () => {
			root.render(
				<AuthProvider>
					<Probe />
				</AuthProvider>,
			)
		})

		currentSession = sessionFor("session-b", "user-b", accountBOrganization.id)
		await act(async () => {
			root.render(
				<AuthProvider>
					<Probe />
				</AuthProvider>,
			)
		})
		expect(listRequests).toHaveLength(2)

		await act(async () => {
			listRequests[1]?.resolve({ data: [accountBOrganization], error: null })
			await Promise.resolve()
		})
		expect(observedOrganizationIds.at(-1)).toEqual([accountBOrganization.id])

		await act(async () => {
			listRequests[0]?.resolve({ data: [accountAOrganization], error: null })
			await Promise.resolve()
		})
		expect(observedOrganizationIds.at(-1)).toEqual([accountBOrganization.id])
	})
})
