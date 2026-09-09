import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	mock,
	test,
} from "bun:test"

const originalFetch = globalThis.fetch
let apiKey = "scoped-key"

function RaycastComponent() {
	return null
}

const Action = Object.assign(RaycastComponent, {
	Push: RaycastComponent,
	SubmitForm: RaycastComponent,
})
const Form = Object.assign(RaycastComponent, {
	TextField: RaycastComponent,
})
const List = Object.assign(RaycastComponent, {
	EmptyView: RaycastComponent,
})
const mutate = mock(async () => undefined)
const useCachedPromise = mock(() => ({
	data: [],
	isLoading: false,
	mutate,
}))
const usePromise = mock(() => ({ data: [], isLoading: false, mutate }))

mock.module("@raycast/api", () => ({
	Action,
	ActionPanel: RaycastComponent,
	Detail: RaycastComponent,
	Form,
	getPreferenceValues: () => ({ apiKey }),
	Icon: {
		ExclamationMark: "exclamation-mark",
		Gear: "gear",
	},
	List,
	openExtensionPreferences: () => undefined,
	showToast: async () => undefined,
	Toast: {
		Style: {
			Failure: "failure",
			Success: "success",
		},
	},
	useNavigation: () => ({ pop: () => undefined }),
}))

mock.module("@raycast/utils", () => ({
	FormValidation: { Required: "required" },
	showFailureToast: async () => undefined,
	useCachedPromise,
	useForm: () => ({ handleSubmit: () => undefined, itemProps: {} }),
	usePromise,
}))

const apiModule = import("../src/api")
const wrapperModule = import("../src/withSupermemory")
const searchProjectsModule = import("../src/search-projects")

function installScopedKeyContract({ searchStatus = 200 } = {}) {
	const requests: Array<{ url: string; init?: RequestInit }> = []
	globalThis.fetch = (async (input, init) => {
		const url = String(input)
		requests.push({ url, init })

		if (url.endsWith("/v3/settings")) {
			return Response.json(
				{ message: "Endpoint not allowed for scoped API key" },
				{ status: 403 },
			)
		}

		if (url.endsWith("/v3/search")) {
			if (searchStatus !== 200) {
				return Response.json({ message: "Invalid API key" }, { status: 401 })
			}
			return Response.json({ results: [], timing: 0, total: 0 })
		}

		return Response.json({ message: "Unexpected endpoint" }, { status: 404 })
	}) as typeof fetch
	return requests
}

describe("Raycast scoped API keys", () => {
	beforeEach(() => {
		apiKey = "scoped-key"
		useCachedPromise.mockClear()
		usePromise.mockClear()
	})

	afterEach(() => {
		globalThis.fetch = originalFetch
	})

	test.serial(
		"renders a configured command without a remote preflight",
		async () => {
			const fetchMock = mock(() => {
				throw new Error("The wrapper must not make an API request")
			})
			globalThis.fetch = fetchMock as typeof fetch
			const { withSupermemory } = await wrapperModule
			function Command() {
				return null
			}

			const rendered = withSupermemory(Command)({})

			expect(rendered.type).toBe(Command)
			expect(fetchMock).not.toHaveBeenCalled()
			expect(usePromise).not.toHaveBeenCalled()
		},
	)

	test.serial("keeps the preferences prompt for a missing key", async () => {
		apiKey = "  "
		const { withSupermemory } = await wrapperModule
		function Command() {
			return null
		}

		const rendered = withSupermemory(Command)({})

		expect(rendered.type).toBe(List)
	})

	test.serial(
		"does not reuse project data cached under another key",
		async () => {
			const { default: WrappedSearchProjects } = await searchProjectsModule
			const wrappedResult = WrappedSearchProjects({})
			const SearchProjects = wrappedResult.type as () => unknown

			SearchProjects()

			expect(usePromise).toHaveBeenCalledTimes(1)
			expect(useCachedPromise).not.toHaveBeenCalled()
		},
	)

	test.serial(
		"searches with a scoped key without probing settings",
		async () => {
			const requests = installScopedKeyContract()
			const { searchMemories } = await apiModule

			await expect(searchMemories({ q: "planning" })).resolves.toEqual([])
			expect(requests.map(({ url }) => new URL(url).pathname)).toEqual([
				"/v3/search",
			])
			expect(requests[0]?.init?.headers).toMatchObject({
				Authorization: "Bearer scoped-key",
			})
		},
	)

	test.serial(
		"still rejects an invalid key during the requested operation",
		async () => {
			installScopedKeyContract({ searchStatus: 401 })
			const { searchMemories } = await apiModule

			await expect(searchMemories({ q: "planning" })).rejects.toThrow(
				"Invalid API key",
			)
		},
	)
})

afterAll(() => {
	mock.restore()
})
