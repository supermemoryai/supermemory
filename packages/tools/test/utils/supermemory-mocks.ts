/**
 * Shared mock helpers for Supermemory tests.
 */

export const createMockProfileResponse = (
	staticMemories: string[] = [],
	dynamicMemories: string[] = [],
	searchResults: string[] = [],
) => ({
	profile: {
		static: staticMemories.map((memory) => ({ memory })),
		dynamic: dynamicMemories.map((memory) => ({ memory })),
	},
	searchResults: {
		results: searchResults.map((memory) => ({ memory })),
	},
})

/**
 * Creates a mock response for the SDK search.memories() endpoint (/v4/search)
 */
export const createMockMemoriesSearchResponse = (memories: string[] = []) => ({
	results: memories.map((memory) => ({ memory })),
})

/**
 * Creates a mock response for the SDK search.documents() endpoint (/v3/search)
 */
export const createMockDocumentsSearchResponse = (
	documents: Array<{ content: string; isRelevant?: boolean }> = [],
) => ({
	results: documents.map((doc, index) => ({
		id: `doc-${index}`,
		chunks: [
			{
				content: doc.content,
				isRelevant: doc.isRelevant ?? true,
			},
		],
	})),
})

/**
 * Creates a mock fetch implementation that routes to different responses
 * based on the URL endpoint.
 */
export const createRoutedFetchMock = (options: {
	profileResponse?: ReturnType<typeof createMockProfileResponse>
	memoriesSearchResponse?: ReturnType<typeof createMockMemoriesSearchResponse>
	documentsSearchResponse?: ReturnType<typeof createMockDocumentsSearchResponse>
	conversationResponse?: { id: string; conversationId: string; status: string }
}) => {
	return (url: string | URL | Request, _init?: RequestInit) => {
		const urlStr = typeof url === "string" ? url : url.toString()

		// Route based on endpoint
		if (urlStr.includes("/v4/profile")) {
			return Promise.resolve({
				ok: true,
				headers: new Headers({ "content-type": "application/json" }),
				json: () =>
					Promise.resolve(
						options.profileResponse ?? createMockProfileResponse(),
					),
			})
		}

		if (urlStr.includes("/v4/search")) {
			return Promise.resolve({
				ok: true,
				headers: new Headers({ "content-type": "application/json" }),
				json: () =>
					Promise.resolve(
						options.memoriesSearchResponse ??
							createMockMemoriesSearchResponse(),
					),
			})
		}

		if (urlStr.includes("/v3/search")) {
			return Promise.resolve({
				ok: true,
				headers: new Headers({ "content-type": "application/json" }),
				json: () =>
					Promise.resolve(
						options.documentsSearchResponse ??
							createMockDocumentsSearchResponse(),
					),
			})
		}

		if (urlStr.includes("/v4/conversations")) {
			return Promise.resolve({
				ok: true,
				headers: new Headers({ "content-type": "application/json" }),
				json: () =>
					Promise.resolve(
						options.conversationResponse ?? {
							id: "mem-123",
							conversationId: "conv-456",
							status: "success",
						},
					),
			})
		}

		// Default fallback
		return Promise.resolve({
			ok: true,
			headers: new Headers({ "content-type": "application/json" }),
			json: () => Promise.resolve({}),
		})
	}
}
