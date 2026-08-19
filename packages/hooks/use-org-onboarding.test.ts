import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
} from "bun:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { mergeOrganizationMetadata } from "../lib/organization-metadata"

interface TestOrganization {
	id: string
	metadata: Record<string, unknown>
}

type UpdateResult = {
	error: { message: string } | null
}

let activeOrganization: TestOrganization | null = null
let persistOrganization: () => Promise<UpdateResult>

const updateOrgMetadata = mock(
	(organizationId: string, partial: Record<string, unknown>) => {
		activeOrganization = mergeOrganizationMetadata(
			activeOrganization,
			organizationId,
			partial,
		)
	},
)

mock.module("@lib/auth-context", () => ({
	useAuth: () => ({
		org: activeOrganization,
		updateOrgMetadata,
	}),
}))

mock.module("@lib/auth", () => ({
	authClient: {
		organization: {
			update: () => persistOrganization(),
		},
	},
}))

let useOrgOnboarding: typeof import("./use-org-onboarding").useOrgOnboarding

beforeAll(async () => {
	;({ useOrgOnboarding } = await import("./use-org-onboarding"))
})

beforeEach(() => {
	activeOrganization = {
		id: "org-a",
		metadata: { isOnboarded: false },
	}
	persistOrganization = async () => ({ error: null })
	updateOrgMetadata.mockClear()
	spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
	mock.restore()
})

function renderOnboardingHook() {
	let hook: ReturnType<typeof useOrgOnboarding> | undefined

	renderToStaticMarkup(
		createElement(() => {
			hook = useOrgOnboarding()
			return null
		}),
	)

	if (!hook) throw new Error("Onboarding hook did not render")
	return hook
}

async function flushUpdate() {
	await Promise.resolve()
	await Promise.resolve()
	await Promise.resolve()
}

describe("useOrgOnboarding", () => {
	it("rolls back a rejected mark update in the same organization", async () => {
		persistOrganization = async () => ({
			error: { message: "Update rejected" },
		})

		renderOnboardingHook().markOrgOnboarded()
		expect(activeOrganization?.metadata.isOnboarded).toBe(true)

		await flushUpdate()

		expect(activeOrganization?.metadata.isOnboarded).toBe(false)
	})

	it("rolls back a rejected reset update in the same organization", async () => {
		activeOrganization = {
			id: "org-a",
			metadata: { isOnboarded: true },
		}
		persistOrganization = async () => ({
			error: { message: "Update rejected" },
		})

		renderOnboardingHook().resetOrgOnboarded()
		expect(activeOrganization?.metadata.isOnboarded).toBe(false)

		await flushUpdate()

		expect(activeOrganization?.metadata.isOnboarded).toBe(true)
	})

	it("does not roll back a different organization", async () => {
		let resolveUpdate: (result: UpdateResult) => void = () => {}
		persistOrganization = () =>
			new Promise((resolve) => {
				resolveUpdate = resolve
			})

		renderOnboardingHook().markOrgOnboarded()
		expect(activeOrganization?.metadata.isOnboarded).toBe(true)

		activeOrganization = {
			id: "org-b",
			metadata: { isOnboarded: true },
		}
		resolveUpdate({ error: { message: "Update rejected" } })
		await flushUpdate()

		expect(activeOrganization).toEqual({
			id: "org-b",
			metadata: { isOnboarded: true },
		})
	})
})
