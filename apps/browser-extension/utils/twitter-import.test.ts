import { afterEach, describe, expect, mock, test } from "bun:test"

mock.module("#imports", () => ({
	storage: {
		defineItem(key: string) {
			return {
				async getValue() {
					switch (key) {
						case "local:bearer-token":
							return "sm_test"
						case "session:twitter-cookie":
							return "cookie"
						case "session:twitter-csrf":
							return "csrf"
						case "session:twitter-auth-token":
							return "auth"
						default:
							return null
					}
				},
				async setValue() {},
			}
		},
	},
}))

const { TwitterImporter } = await import("./twitter-import")

const originalFetch = globalThis.fetch

afterEach(() => {
	globalThis.fetch = originalFetch
})

type TimelineEntry = {
	entryId: string
	sortIndex: string
	content: Record<string, unknown>
}

function timelinePage(entries: TimelineEntry[]) {
	return {
		data: {
			bookmark_timeline_v2: {
				timeline: {
					instructions: [{ type: "TimelineAddEntries", entries }],
				},
			},
		},
	}
}

function cursorEntry(value: string): TimelineEntry {
	return {
		entryId: `cursor-bottom-${value}`,
		sortIndex: "0",
		content: { value },
	}
}

function tombstoneEntry(id: string): TimelineEntry {
	return {
		entryId: `tweet-${id}`,
		sortIndex: "0",
		content: {
			itemContent: {
				tweet_results: { result: { __typename: "TweetTombstone" } },
			},
		},
	}
}

function tweetEntry(id: string): TimelineEntry {
	return {
		entryId: `tweet-${id}`,
		sortIndex: "0",
		content: {
			itemContent: {
				tweet_results: {
					result: {
						__typename: "Tweet",
						legacy: {
							favorite_count: 1,
							created_at: "Mon Jan 01 00:00:00 +0000 2024",
							id_str: id,
							full_text: `Tweet ${id}`,
						},
						core: {
							user_results: {
								result: {
									legacy: {
										id_str: "author-1",
										name: "Author",
										profile_image_url_https: "",
										screen_name: "author",
										verified: false,
									},
								},
							},
						},
					},
				},
			},
		},
	}
}

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { "Content-Type": "application/json" },
	})
}

function installFetch(responses: Response[]) {
	const twitterRequests: string[] = []
	const savedIds: string[][] = []

	globalThis.fetch = mock(async (input, init) => {
		const url = String(input)

		if (url.startsWith("https://x.com/")) {
			twitterRequests.push(url)
			const response = responses.shift()
			if (!response) {
				throw new Error(`Unexpected Twitter request: ${url}`)
			}
			return response
		}

		if (url.endsWith("/v3/documents/batch")) {
			const body = JSON.parse(String(init?.body)) as {
				documents: Array<{ customId: string }>
			}
			savedIds.push(body.documents.map((document) => document.customId))
			return jsonResponse({ success: true })
		}

		throw new Error(`Unexpected request: ${url}`)
	}) as unknown as typeof fetch

	return { savedIds, twitterRequests }
}

function requestCursors(requests: string[]) {
	return requests.map((request) => {
		const variables = new URL(request).searchParams.get("variables")
		return variables
			? (JSON.parse(variables) as { cursor?: string }).cursor
			: undefined
	})
}

function createCallbacks() {
	const completions: number[] = []
	const errors: Error[] = []
	const progress: string[] = []

	return {
		completions,
		config: {
			onComplete: async (total: number) => {
				completions.push(total)
			},
			onError: async (error: Error) => {
				errors.push(error)
			},
			onProgress: async (message: string) => {
				progress.push(message)
			},
		},
		errors,
		progress,
	}
}

describe("TwitterImporter pagination", () => {
	test("continues past an untransformable page when a new cursor is present", async () => {
		const { savedIds, twitterRequests } = installFetch([
			jsonResponse(
				timelinePage([tombstoneEntry("gone"), cursorEntry("cursor-a")]),
			),
			jsonResponse(timelinePage([tweetEntry("later-tweet")])),
		])
		const { completions, config, errors } = createCallbacks()
		const waits: number[] = []
		const importer = new TwitterImporter(config, async (milliseconds) => {
			waits.push(milliseconds)
		})

		await importer.startImport()

		expect(errors).toEqual([])
		expect(completions).toEqual([1])
		expect(requestCursors(twitterRequests)).toEqual([undefined, "cursor-a"])
		expect(savedIds).toEqual([["later-tweet"]])
		expect(waits).toEqual([1000])
	})

	test("reports a cyclic cursor chain instead of claiming completion", async () => {
		const { twitterRequests } = installFetch([
			jsonResponse(timelinePage([cursorEntry("cursor-a")])),
			jsonResponse(timelinePage([cursorEntry("cursor-b")])),
			jsonResponse(timelinePage([cursorEntry("cursor-a")])),
		])
		const { completions, config, errors } = createCallbacks()
		const importer = new TwitterImporter(config, async () => {})

		await importer.startImport()

		expect(completions).toEqual([])
		expect(errors.map((error) => error.message)).toEqual([
			"X returned a repeated pagination cursor. Import stopped after 0 tweets to avoid a loop.",
		])
		expect(requestCursors(twitterRequests)).toEqual([
			undefined,
			"cursor-a",
			"cursor-b",
		])
	})

	test("retries a rate-limited cursor without treating it as a cycle", async () => {
		const { savedIds, twitterRequests } = installFetch([
			jsonResponse(timelinePage([cursorEntry("cursor-a")])),
			jsonResponse({ error: "rate limited" }, 429),
			jsonResponse(timelinePage([tweetEntry("after-retry")])),
		])
		const { completions, config, errors, progress } = createCallbacks()
		const waits: number[] = []
		const importer = new TwitterImporter(config, async (milliseconds) => {
			waits.push(milliseconds)
		})

		await importer.startImport()

		expect(errors).toEqual([])
		expect(completions).toEqual([1])
		expect(requestCursors(twitterRequests)).toEqual([
			undefined,
			"cursor-a",
			"cursor-a",
		])
		expect(savedIds).toEqual([["after-retry"]])
		expect(waits).toEqual([1000, 60000])
		expect(progress).toContain(
			"Rate limit reached. Waiting for 60 seconds before retrying...",
		)
	})
})
