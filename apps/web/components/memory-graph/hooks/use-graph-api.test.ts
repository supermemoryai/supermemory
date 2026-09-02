import { describe, expect, it, mock } from "bun:test"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import type {
	ApiDocument,
	ApiDocumentsResponse,
	ApiMemoryEntry,
} from "./use-graph-api"

const ISOLATED_HOOK_TEST_ENV = "GRAPH_API_HOOK_INTEGRATION_TEST"
const testFilePath = fileURLToPath(import.meta.url)

if (process.env[ISOLATED_HOOK_TEST_ENV] === "1") {
	await registerUseGraphApiIntegrationTests()
} else {
	const graphApi = await import("./use-graph-api")
	registerGraphApiPaginationTests(graphApi)

	describe("useGraphApi document normalization wiring", () => {
		it("passes in an isolated Bun process", () => {
			const result = spawnSync(process.execPath, ["test", testFilePath], {
				cwd: process.cwd(),
				encoding: "utf8",
				env: { ...process.env, [ISOLATED_HOOK_TEST_ENV]: "1" },
			})

			if (result.status !== 0) {
				throw new Error(
					`Isolated useGraphApi tests failed:\n${result.stdout}\n${result.stderr}`,
				)
			}
			expect(result.status).toBe(0)
		})
	})
}

function makeMemory(
	id: string,
	spaceContainerTag: string,
	overrides: Partial<Omit<ApiMemoryEntry, "id" | "spaceContainerTag">> = {},
): ApiMemoryEntry {
	return {
		id,
		memory: id,
		spaceId: "space",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		spaceContainerTag,
		...overrides,
	}
}

function makeDocument(
	id: string,
	memoryEntries: ApiMemoryEntry[],
	overrides: Partial<Omit<ApiDocument, "id" | "memoryEntries">> = {},
): ApiDocument {
	return {
		id,
		title: id,
		type: "text",
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		...overrides,
		memoryEntries,
	}
}

function makePage(
	currentPage: number,
	totalPages: number,
	documents: ApiDocument[],
): ApiDocumentsResponse {
	return {
		documents,
		pagination: {
			currentPage,
			limit: 500,
			totalItems: documents.length,
			totalPages,
		},
	}
}

function makePages(): ApiDocumentsResponse[] {
	return [
		makePage(1, 3, [
			makeDocument(
				"doc-a",
				[
					makeMemory("shared-memory", "included", {
						relation: "extends",
					}),
					makeMemory("filtered-memory", "excluded"),
				],
				{ title: "First canonical title", summary: "First canonical summary" },
			),
		]),
		makePage(2, 3, [
			makeDocument("doc-b", [
				makeMemory("shared-memory", "included", { relation: "derives" }),
				makeMemory("unique-memory", "included"),
			]),
			makeDocument(
				"doc-a",
				[
					makeMemory("shared-memory", "included", {
						relation: "updates",
					}),
					makeMemory("late-memory", "included", { relation: "derives" }),
				],
				{ title: "Later duplicate title", summary: "Later duplicate summary" },
			),
		]),
	]
}

function registerGraphApiPaginationTests(
	graphApi: Pick<
		typeof import("./use-graph-api"),
		"getLoadedGraphNodeCount" | "getNextGraphPageParam"
	>,
) {
	const pages = makePages()

	describe("graph API pagination node accounting", () => {
		it("counts unique document and memory IDs across every loaded page", () => {
			expect(graphApi.getLoadedGraphNodeCount(pages)).toBe(6)
			expect(graphApi.getLoadedGraphNodeCount(pages, ["included"])).toBe(5)
		})

		it("uses the filtered unique count to decide whether another page is needed", () => {
			const lastPage = pages.at(-1)
			if (!lastPage) throw new Error("Missing pagination fixture")

			expect(
				graphApi.getNextGraphPageParam(lastPage, pages, {
					hasDocumentIds: false,
					maxNodes: 6,
				}),
			).toBeUndefined()
			expect(
				graphApi.getNextGraphPageParam(lastPage, pages, {
					hasDocumentIds: false,
					maxNodes: 6,
					containerTags: ["included"],
				}),
			).toBe(3)
			expect(
				graphApi.getNextGraphPageParam(lastPage, pages, {
					hasDocumentIds: false,
					maxNodes: 5,
					containerTags: ["included"],
				}),
			).toBeUndefined()
		})

		it("never paginates the by-IDs request path", () => {
			const lastPage = pages.at(-1)
			if (!lastPage) throw new Error("Missing pagination fixture")

			expect(
				graphApi.getNextGraphPageParam(lastPage, pages, {
					hasDocumentIds: true,
					maxNodes: 100,
					containerTags: ["included"],
				}),
			).toBeUndefined()
		})
	})
}

async function registerUseGraphApiIntegrationTests() {
	const pages = makePages()
	type QueryOptions = {
		getNextPageParam: (
			lastPage: ApiDocumentsResponse,
			allPages: readonly ApiDocumentsResponse[],
		) => number | undefined
	}
	let queryOptions: QueryOptions | null = null

	mock.module("@tanstack/react-query", () => ({
		useInfiniteQuery: (options: QueryOptions) => {
			queryOptions = options
			return {
				data: { pages },
				error: null,
				isPending: false,
				isFetchingNextPage: false,
				hasNextPage: true,
				fetchNextPage: mock(async () => undefined),
			}
		},
	}))
	mock.module("react", () => ({
		useEffect: () => undefined,
		useMemo: <T>(factory: () => T) => factory(),
	}))
	mock.module("@lib/api", () => ({
		$fetch: () => {
			throw new Error("The integration fixture must not make a request")
		},
	}))

	const { getLoadedGraphNodeCount, useGraphApi } = await import(
		"./use-graph-api"
	)

	describe("useGraphApi cross-page document normalization", () => {
		it("renders each document once while retaining first metadata and later memories", () => {
			const result = useGraphApi({
				containerTags: ["included"],
				maxNodes: 5,
			})
			const documentIds = result.documents.map((document) => document.id)

			expect(documentIds).toEqual(["doc-a", "doc-b"])
			expect(new Set(documentIds).size).toBe(result.documents.length)

			const documentA = result.documents.find(
				(document) => document.id === "doc-a",
			)
			const documentB = result.documents.find(
				(document) => document.id === "doc-b",
			)
			expect(documentA).toBeDefined()
			expect(documentB).toBeDefined()
			expect(documentA?.title).toBe("First canonical title")
			expect(documentA?.summary).toBe("First canonical summary")
			expect(documentA?.memories.map((memory) => memory.id)).toEqual([
				"shared-memory",
				"late-memory",
			])
			expect(documentA?.memories[0]?.relation).toBe("extends")
			expect(documentA?.memories[1]?.relation).toBe("derives")
			expect(documentB?.memories[0]?.id).toBe("shared-memory")
			expect(documentB?.memories[0]?.relation).toBe("derives")

			const uniqueMemoryIds = new Set(
				result.documents.flatMap((document) =>
					document.memories.map((memory) => memory.id),
				),
			)
			const renderedUniqueNodeCount =
				new Set(documentIds).size + uniqueMemoryIds.size
			expect(renderedUniqueNodeCount).toBe(5)
			expect(getLoadedGraphNodeCount(pages, ["included"])).toBe(
				renderedUniqueNodeCount,
			)

			if (!queryOptions) throw new Error("Query options were not captured")
			const lastPage = pages.at(-1)
			if (!lastPage) throw new Error("Missing pagination fixture")
			expect(queryOptions.getNextPageParam(lastPage, pages)).toBeUndefined()
		})

		it("keeps production pagination open below the unique-node budget", () => {
			queryOptions = null
			const result = useGraphApi({
				containerTags: ["included"],
				maxNodes: 6,
			})
			expect(result.documents.map((document) => document.id)).toEqual([
				"doc-a",
				"doc-b",
			])
			expect(getLoadedGraphNodeCount(pages, ["included"])).toBe(5)

			if (!queryOptions) throw new Error("Query options were not captured")
			const lastPage = pages.at(-1)
			if (!lastPage) throw new Error("Missing pagination fixture")
			expect(queryOptions.getNextPageParam(lastPage, pages)).toBe(3)
		})
	})
}
