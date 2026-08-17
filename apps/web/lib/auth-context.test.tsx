import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
} from "bun:test"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const ISOLATED_RUN_ENV = "AUTH_CONTEXT_MOUNTED_TEST"
const testFilePath = fileURLToPath(import.meta.url)

if (process.env[ISOLATED_RUN_ENV] === "1") {
	await registerMountedAuthProviderTests()
} else {
	describe("AuthProvider mounted regressions", () => {
		it("passes in an isolated Bun process", () => {
			const result = spawnSync(process.execPath, ["test", testFilePath], {
				cwd: process.cwd(),
				encoding: "utf8",
				env: { ...process.env, [ISOLATED_RUN_ENV]: "1" },
			})

			if (result.status !== 0) {
				throw new Error(
					`Isolated AuthProvider tests failed:\n${result.stdout}\n${result.stderr}`,
				)
			}
			expect(result.status).toBe(0)
		})
	})
}

async function registerMountedAuthProviderTests() {
	const { Window } = await import("happy-dom")

	const currentOrganization = { id: "org-current", slug: "current" }
	const savedOrganization = { id: "org-saved", slug: "saved" }
	const organizations = [currentOrganization, savedOrganization]
	const sessionResult = {
		data: {
			session: {
				id: "session-a",
				activeOrganizationId: currentOrganization.id,
			},
			user: { id: "user-a" },
		},
		isPending: false,
	}
	const refetchOrganizations = mock(async () => ({ data: organizations }))
	const setActive = mock(
		async (input: {
			organizationSlug?: string
			organizationId?: string | null
		}) => ({
			data:
				input.organizationSlug === savedOrganization.slug
					? savedOrganization
					: currentOrganization,
		}),
	)
	const getFullOrganization = mock(async () => ({
		data: currentOrganization,
	}))
	const authModuleFactory = () => ({
		authClient: {
			$Infer: {},
			useListOrganizations: () => ({
				data: organizations,
				isPending: false,
				refetch: refetchOrganizations,
			}),
			organization: {
				getFullOrganization,
				setActive,
			},
		},
		useSession: () => sessionResult,
	})
	const authModulePath = fileURLToPath(
		new URL("../../../packages/lib/auth.ts", import.meta.url),
	)
	mock.module(authModulePath, authModuleFactory)
	mock.module("@lib/auth", authModuleFactory)

	const browserWindow = new Window({ url: "https://app.supermemory.ai/brain" })
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

	for (const name of installedGlobals) {
		Object.defineProperty(globalThis, name, {
			configurable: true,
			value: browserWindow[name],
		})
	}
	Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
		configurable: true,
		writable: true,
		value: true,
	})

	const { act, useSyncExternalStore } = await import("react")
	let currentPathname = window.location.pathname
	const pathnameListeners = new Set<() => void>()
	const getPathnameSnapshot = () => currentPathname
	const subscribeToPathname = (listener: () => void) => {
		pathnameListeners.add(listener)
		return () => pathnameListeners.delete(listener)
	}
	mock.module("next/navigation", () => ({
		usePathname: () =>
			useSyncExternalStore(
				subscribeToPathname,
				getPathnameSnapshot,
				getPathnameSnapshot,
			),
	}))

	const [{ createRoot }, { AuthProvider }] = await Promise.all([
		import("react-dom/client"),
		import("@lib/auth-context"),
	])
	const savedOrganizationKey = "supermemory-consumer-last-org-slug"
	let container: HTMLDivElement
	let root: ReturnType<typeof createRoot>
	const setPathname = (pathname: string) => {
		currentPathname = pathname
		window.history.replaceState(null, "", pathname)
		for (const listener of pathnameListeners) listener()
	}

	beforeEach(() => {
		setActive.mockClear()
		getFullOrganization.mockClear()
		refetchOrganizations.mockClear()
		window.localStorage.clear()
		window.localStorage.setItem(savedOrganizationKey, savedOrganization.slug)
		setPathname("/brain")
		container = document.createElement("div")
		document.body.append(container)
		root = createRoot(container)
	})

	afterEach(async () => {
		await act(async () => root.unmount())
		container.remove()
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

	describe("saved organization restoration", () => {
		it("restores the saved organization away from consent", async () => {
			setPathname("/brain")
			await act(async () => {
				root.render(
					<AuthProvider>
						<div />
					</AuthProvider>,
				)
			})

			expect(setActive).toHaveBeenCalledTimes(1)
			expect(setActive).toHaveBeenCalledWith({
				organizationSlug: savedOrganization.slug,
			})
			expect(getFullOrganization).not.toHaveBeenCalled()
		})

		for (const pathname of ["/oauth/consent", "/oauth/consent/"]) {
			it(`leaves ${pathname} organization selection to consent`, async () => {
				setPathname(pathname)
				await act(async () => {
					root.render(
						<AuthProvider>
							<div />
						</AuthProvider>,
					)
				})

				expect(getFullOrganization).toHaveBeenCalledTimes(1)
				expect(setActive).not.toHaveBeenCalled()
			})
		}

		it("restores the saved organization after consent navigates to brain", async () => {
			setPathname("/oauth/consent/")
			await act(async () => {
				root.render(
					<AuthProvider>
						<div />
					</AuthProvider>,
				)
			})
			expect(getFullOrganization).toHaveBeenCalledTimes(1)
			expect(setActive).not.toHaveBeenCalled()

			await act(async () => {
				setPathname("/brain")
			})

			expect(setActive).toHaveBeenCalledTimes(1)
			expect(setActive).toHaveBeenCalledWith({
				organizationSlug: savedOrganization.slug,
			})
		})
	})
}
