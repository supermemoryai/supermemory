// Fake v5 API responses for tests that stub globalThis.fetch.

export const jsonResponse = (body: unknown, status = 200): Response =>
	new Response(JSON.stringify(body), {
		status,
		headers: { "content-type": "application/json" },
	})

export const errorResponse = (status = 500, message = "Server error") =>
	jsonResponse({ error: message }, status)

export const profileBody = (
	staticMemories: string[] = [],
	dynamicMemories: string[] = [],
) => ({
	profile: {
		static: staticMemories.map((memory, index) => ({
			id: `static_${index}`,
			memory,
		})),
		dynamic: dynamicMemories.map((memory, index) => ({
			id: `dynamic_${index}`,
			memory,
		})),
		buckets: {},
	},
})

export const searchBody = (memories: string[] = []) => ({
	results: memories.map((memory, index) => ({
		id: `mem_${index}`,
		memory,
		metadata: {},
		similarity: 0.9,
		isLatest: true,
		isInference: false,
		system: { createdAt: "2026-01-01", updatedAt: "2026-01-01" },
	})),
	searchTime: 1,
})

export const addBody = (id = "doc_1") => ({ id, status: "queued" })

export const requestPath = (input: unknown): string =>
	new URL(String(input instanceof Request ? input.url : input)).pathname

export const requestJson = (init?: RequestInit): Record<string, unknown> =>
	init?.body ? JSON.parse(String(init.body)) : {}

// Routes by path suffix so a single mock serves profile, search, and add calls.
export const v5Router =
	(routes: {
		profile?: () => unknown
		search?: () => unknown
		document?: () => unknown
	}) =>
	async (input: unknown): Promise<Response> => {
		const path = requestPath(input)
		if (path.endsWith("/profile"))
			return jsonResponse(routes.profile?.() ?? profileBody())
		if (path.endsWith("/search"))
			return jsonResponse(routes.search?.() ?? searchBody())
		if (path.endsWith("/document"))
			return jsonResponse(routes.document?.() ?? addBody())
		return errorResponse(404, `Unexpected path ${path}`)
	}
