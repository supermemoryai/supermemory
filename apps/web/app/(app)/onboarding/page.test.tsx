import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
} from "bun:test"
import type { ReactNode } from "react"
import { Window } from "happy-dom"
import { onboardingDraftKey } from "@/lib/brain-onboarding-draft"

type AboutValues = {
	name: string
	about: string
	workspaceName: string
	workspaceDomain: string
}

type AboutProps = {
	values: AboutValues
	onChange: (values: AboutValues) => void
	onContinue: () => void | Promise<void>
}

type CreateOrganizationInput = {
	name: string
	slug: string
	metadata: Record<string, unknown> & { brainAbout?: string }
}

const browserWindow = new Window({
	url: "https://app.supermemory.ai/onboarding",
})
const browserGlobals = [
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
	browserGlobals.map((name) => [
		name,
		Object.getOwnPropertyDescriptor(globalThis, name),
	]),
)
const originalActEnvironment = Object.getOwnPropertyDescriptor(
	globalThis,
	"IS_REACT_ACT_ENVIRONMENT",
)

for (const name of browserGlobals) {
	Object.defineProperty(globalThis, name, {
		configurable: true,
		value: browserWindow[name],
	})
}
Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
	configurable: true,
	value: true,
})

const React = await import("react")

const accountA = {
	id: "user-a",
	name: "Alice A",
	email: "alice@gmail.com",
	image: null,
}
const accountB = {
	id: "user-b",
	name: "Bob B",
	email: "bob@gmail.com",
	image: null,
}
let currentUser = accountA
let latestAboutProps: AboutProps | null = null

const router = { push: mock(), replace: mock() }
const searchParams = new URLSearchParams()
const setActiveOrg = mock(async () => {})
const refetchOrganizations = mock(async () => {})
const createOrganization = mock(async (_input: CreateOrganizationInput) => ({
	data: { slug: "created-workspace" },
	error: null,
}))
const updateUser = mock(async () => ({ data: {}, error: null }))

mock.module("next/navigation", () => ({
	useRouter: () => router,
	useSearchParams: () => searchParams,
}))

mock.module("@tanstack/react-query", () => ({
	useQueryClient: () => ({ invalidateQueries: mock() }),
}))

mock.module("sonner", () => ({
	toast: { error: mock(), success: mock() },
}))

mock.module("@lib/auth-context", () => ({
	useAuth: () => ({
		user: currentUser,
		session: { id: `session-${currentUser.id}` },
		isSessionPending: false,
		isRestoring: false,
		org: null,
		organizations: [],
		setActiveOrg,
		refetchOrganizations,
	}),
}))

mock.module("@lib/auth", () => ({
	authClient: {
		organization: {
			create: createOrganization,
			inviteMember: mock(async () => ({ data: {}, error: null })),
		},
		updateUser,
	},
}))

mock.module("@lib/constants", () => ({
	SHARED_TEAM_BRAIN_TAG: "sm_org_shared",
}))

mock.module("@/lib/analytics", () => ({
	analytics: new Proxy({} as Record<string, () => void>, {
		get: () => () => {},
	}),
}))

mock.module("@/lib/company-brain-entry", () => ({
	resolveCompanyBrainEntry: () => ({ action: "create" }),
}))

mock.module("@/components/onboarding-brain/shell", () => ({
	BrainShell: ({ children }: { children: ReactNode }) =>
		React.createElement("main", null, children),
}))

mock.module("@/components/onboarding-brain/step-about", () => ({
	StepAbout: (props: AboutProps) => {
		latestAboutProps = props
		return React.createElement("output", null, JSON.stringify(props.values))
	},
}))

mock.module("@/components/onboarding-brain/step-sources", () => ({
	StepSources: () => null,
}))
mock.module("@/components/onboarding-brain/step-ingest", () => ({
	StepIngest: () => null,
}))
mock.module("@/components/onboarding-brain/step-team", () => ({
	StepTeam: () => null,
}))
mock.module("@/components/onboarding-brain/company-brain-onboarding", () => ({
	CompanyBrainOnboarding: () => null,
}))

const [{ act }, { createRoot }, { default: BrainOnboardingPage }] =
	await Promise.all([
		import("react"),
		import("react-dom/client"),
		import("./page"),
	])

let root: ReturnType<typeof createRoot> | null = null
let container: HTMLElement | null = null

function aboutProps(): AboutProps {
	if (!latestAboutProps) throw new Error("StepAbout was not rendered")
	return latestAboutProps
}

async function renderPage() {
	await act(async () => {
		root?.render(React.createElement(BrainOnboardingPage))
		await Promise.resolve()
	})
}

beforeEach(() => {
	currentUser = accountA
	latestAboutProps = null
	localStorage.clear()
	for (const key of [...searchParams.keys()]) searchParams.delete(key)
	createOrganization.mockClear()
	updateUser.mockClear()
	router.push.mockClear()
	router.replace.mockClear()

	container = document.createElement("div")
	document.body.append(container)
	root = createRoot(container)
})

afterEach(async () => {
	await act(async () => root?.unmount())
	container?.remove()
	root = null
	container = null
})

afterAll(() => {
	for (const name of browserGlobals) {
		const descriptor = originalDescriptors.get(name)
		if (descriptor) Object.defineProperty(globalThis, name, descriptor)
		else Reflect.deleteProperty(globalThis, name)
	}
	if (originalActEnvironment) {
		Object.defineProperty(
			globalThis,
			"IS_REACT_ACT_ENVIRONMENT",
			originalActEnvironment,
		)
	} else {
		Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT")
	}
	void browserWindow.close()
})

describe("onboarding draft ownership", () => {
	it("isolates drafts and mutations across an A to B to A account switch", async () => {
		localStorage.setItem(
			"supermemory-brain-onboarding-v1",
			JSON.stringify({ about: { name: "Unowned legacy draft" } }),
		)
		await renderPage()

		const aliceDraft: AboutValues = {
			name: "Alice Secret",
			about: "Confidential acquisition planning",
			workspaceName: "Alice Private Brain",
			workspaceDomain: "alice.example",
		}

		await act(async () => {
			aboutProps().onChange(aliceDraft)
			await Promise.resolve()
		})
		expect(aboutProps().values).toEqual(aliceDraft)

		currentUser = accountB
		await renderPage()

		const bobValues = aboutProps().values
		expect(bobValues.name).toBe("Bob B")
		expect(bobValues.about).toBe("")
		expect(bobValues.workspaceName).not.toBe(aliceDraft.workspaceName)
		expect(JSON.stringify(bobValues)).not.toContain("Alice")

		await act(async () => {
			await aboutProps().onContinue()
		})

		const createPayload = createOrganization.mock.calls[0]?.[0]
		expect(createPayload?.name).toBe(bobValues.workspaceName)
		expect(createPayload?.metadata.brainAbout).toBeUndefined()
		expect(JSON.stringify(createPayload)).not.toContain("Alice")
		expect(updateUser).toHaveBeenCalledWith(
			expect.objectContaining({
				name: "Bob B",
				displayUsername: "Bob B",
			}),
		)

		currentUser = accountA
		await renderPage()

		expect(aboutProps().values).toEqual(aliceDraft)
		expect(localStorage.getItem("supermemory-brain-onboarding-v1")).toBeNull()
	})

	it("starts a fresh user-owned draft when new workspace mode is forced", async () => {
		await renderPage()
		const existingDraft: AboutValues = {
			name: "Alice Secret",
			about: "Existing private draft",
			workspaceName: "Existing Workspace",
			workspaceDomain: "existing.example",
		}
		await act(async () => {
			aboutProps().onChange(existingDraft)
			await Promise.resolve()
		})

		searchParams.set("new", "1")
		searchParams.set("name", "Fresh Workspace")
		await renderPage()

		expect(aboutProps().values).toEqual({
			name: "Alice A",
			about: "",
			workspaceName: "Fresh Workspace",
			workspaceDomain: "",
		})
		const persisted = localStorage.getItem(onboardingDraftKey(accountA.id))
		expect(persisted).not.toBeNull()
		expect(persisted).not.toContain("Existing private draft")

		searchParams.delete("new")
		searchParams.delete("name")
		await renderPage()
		expect(aboutProps().values.about).toBe("")
		expect(aboutProps().values.workspaceName).not.toBe(
			existingDraft.workspaceName,
		)
	})
})
