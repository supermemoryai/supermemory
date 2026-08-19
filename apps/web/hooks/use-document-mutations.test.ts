import { afterAll, beforeEach, describe, expect, it, mock } from "bun:test"

type SpaceSettingsResult =
	| { containerTag: string; entityContext: string | null; name: string | null }
	| Error

type DocumentRequest = {
	body?: Record<string, unknown>
}

let spaceSettingsResult: SpaceSettingsResult = new Error(
	"space settings result not configured",
)
const documentRequests: { route: string; options: DocumentRequest }[] = []
const fileRequestBodies: (FormData | null)[] = []

const fetchQuery = mock(async () => {
	if (spaceSettingsResult instanceof Error) throw spaceSettingsResult
	return spaceSettingsResult
})

const originalFetch = globalThis.fetch
const uploadFetch = mock(
	async (
		_input: Parameters<typeof fetch>[0],
		init?: Parameters<typeof fetch>[1],
	): Promise<Response> => {
		fileRequestBodies.push(init?.body instanceof FormData ? init.body : null)
		return Response.json({ id: "document-1" })
	},
)
globalThis.fetch = Object.assign(uploadFetch, {
	preconnect: originalFetch.preconnect,
})

mock.module("@tanstack/react-query", () => ({
	useMutation: (options: {
		mutationFn: (variables: unknown) => Promise<unknown>
	}) => ({ mutateAsync: options.mutationFn }),
	useQuery: () => ({}),
	useQueryClient: () => ({ fetchQuery }),
}))

mock.module("sonner", () => ({
	toast: {
		error: () => {},
		success: () => {},
		warning: () => {},
	},
}))

mock.module("@lib/api", () => ({
	$fetch: async (route: string, options: DocumentRequest = {}) => {
		documentRequests.push({ route, options })
		return { data: { id: "document-1" }, error: null }
	},
}))

mock.module("@lib/auth-context", () => ({
	useAuth: () => ({ user: { name: "Ada" } }),
}))

mock.module("@/lib/analytics", () => ({
	analytics: {
		documentAdded: () => {},
		documentDeleted: () => {},
		documentEdited: () => {},
		documentsBulkDeleted: () => {},
	},
}))

const { useDocumentMutations } = await import("./use-document-mutations")

afterAll(() => {
	globalThis.fetch = originalFetch
	mock.restore()
})

const defaultEntityContext =
	"This is Ada, saving items in a personal knowledge management system. This may be websites, links, notes, journals, PDFs, etc. Understand the user from it into a graph."

async function saveNote() {
	const { noteMutation } = useDocumentMutations()
	await noteMutation.mutateAsync({ content: "A note", project: "space-1" })
	return documentRequests[0]
}

async function uploadFile() {
	const { fileMutation } = useDocumentMutations()
	await fileMutation.mutateAsync({
		fileEntries: [
			{
				id: "file-1",
				file: new File(["contents"], "note.txt", { type: "text/plain" }),
			},
		],
		project: "space-1",
	})
	return fileRequestBodies[0]
}

describe("document mutation entity context", () => {
	beforeEach(() => {
		spaceSettingsResult = new Error("space settings result not configured")
		documentRequests.length = 0
		fileRequestBodies.length = 0
		fetchQuery.mockClear()
		uploadFetch.mockClear()
	})

	it("omits the default when the space has a configured context", async () => {
		spaceSettingsResult = {
			containerTag: "space-1",
			entityContext: "Remember work decisions",
			name: "Work",
		}

		const request = await saveNote()

		expect(request).toEqual({
			route: "@post/documents",
			options: {
				body: {
					content: "A note",
					containerTags: ["space-1"],
					metadata: { sm_source: "consumer" },
				},
			},
		})
		expect(fetchQuery).toHaveBeenCalledTimes(1)
	})

	it("includes the default after settings confirm the context is empty", async () => {
		spaceSettingsResult = {
			containerTag: "space-1",
			entityContext: null,
			name: "Personal",
		}

		const request = await saveNote()

		expect(request?.options.body).toEqual({
			content: "A note",
			containerTags: ["space-1"],
			entityContext: defaultEntityContext,
			metadata: { sm_source: "consumer" },
		})
	})

	it("still saves but omits the context when settings cannot be read", async () => {
		spaceSettingsResult = new Error("settings unavailable")

		const request = await saveNote()

		expect(request).toEqual({
			route: "@post/documents",
			options: {
				body: {
					content: "A note",
					containerTags: ["space-1"],
					metadata: { sm_source: "consumer" },
				},
			},
		})
		expect(fetchQuery).toHaveBeenCalledTimes(1)
	})

	it("omits the context from file uploads when settings cannot be read", async () => {
		spaceSettingsResult = new Error("settings unavailable")

		const formData = await uploadFile()

		expect(formData?.get("containerTags")).toBe('["space-1"]')
		expect(formData?.get("entityContext")).toBeNull()
		expect(uploadFetch).toHaveBeenCalledTimes(1)
	})
})
