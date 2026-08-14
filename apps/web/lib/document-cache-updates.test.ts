import { describe, expect, it } from "bun:test"
import {
	addOptimisticMemoryToQueryData,
	type OptimisticMemory,
	removeDocumentFromQueryData,
	removeDocumentsFromQueryData,
} from "./document-cache-updates"

type Page = {
	documents: Array<{ id?: string; customId?: string | null }>
	pagination: { totalItems: number }
}

const page = (ids: string[], totalItems: number): Page => ({
	documents: ids.map((id) => ({ id })),
	pagination: { totalItems },
})

const pagesData = (pages: Page[]) => ({ pages, pageParams: [] })

const totalsPerPage = (result: unknown): number[] =>
	(result as { pages: Page[] }).pages.map((p) => p.pagination.totalItems)

const idsPerPage = (result: unknown): string[][] =>
	(result as { pages: Page[] }).pages.map((p) =>
		p.documents.map((d) => d.id ?? ""),
	)

describe("removeDocumentsFromQueryData (infinite pages)", () => {
	it("decrements every page's grand total by the number removed across all pages", () => {
		// totalItems is the same grand total on every page; consumers read page 0.
		const data = pagesData([page(["a", "b", "c"], 6), page(["d", "e", "f"], 6)])

		// Delete two documents that live on the SECOND page only.
		const result = removeDocumentsFromQueryData(data, new Set(["e", "f"]))

		expect(idsPerPage(result)).toEqual([["a", "b", "c"], ["d"]])
		// Both pages (page 0 included) must drop to 4, not stay at 6 / 6.
		expect(totalsPerPage(result)).toEqual([4, 4])
	})

	it("handles deletions spread across multiple pages", () => {
		const data = pagesData([page(["a", "b"], 5), page(["c", "d", "e"], 5)])

		const result = removeDocumentsFromQueryData(data, new Set(["a", "c", "d"]))

		expect(idsPerPage(result)).toEqual([["b"], ["e"]])
		expect(totalsPerPage(result)).toEqual([2, 2])
	})

	it("clamps the total at zero and ignores unknown ids", () => {
		const data = pagesData([page(["a"], 1)])

		const result = removeDocumentsFromQueryData(
			data,
			new Set(["a", "does-not-exist"]),
		)

		expect(idsPerPage(result)).toEqual([[]])
		expect(totalsPerPage(result)).toEqual([0])
	})

	it("matches customId as well as id", () => {
		const data = {
			pages: [
				{
					documents: [{ id: "1", customId: "cust-1" }, { id: "2" }],
					pagination: { totalItems: 2 },
				},
			],
			pageParams: [],
		}

		const result = removeDocumentsFromQueryData(data, new Set(["cust-1"]))

		expect(idsPerPage(result)).toEqual([["2"]])
		expect(totalsPerPage(result)).toEqual([1])
	})

	it("updates the flat { documents } shape", () => {
		const data = {
			documents: [{ id: "a" }, { id: "b" }, { id: "c" }],
			totalCount: 3,
		}

		const result = removeDocumentsFromQueryData(data, new Set(["a", "b"])) as {
			documents: Array<{ id: string }>
			totalCount: number
		}

		expect(result.documents.map((d) => d.id)).toEqual(["c"])
		expect(result.totalCount).toBe(1)
	})

	it("returns the input untouched for an empty id set", () => {
		const data = pagesData([page(["a"], 1)])
		expect(removeDocumentsFromQueryData(data, new Set())).toBe(data)
	})
})

describe("removeDocumentFromQueryData (single)", () => {
	it("drops the doc and decrements the grand total once per page", () => {
		const data = pagesData([page(["a", "b"], 4), page(["c", "d"], 4)])

		const result = removeDocumentFromQueryData(data, "c")

		expect(idsPerPage(result)).toEqual([["a", "b"], ["d"]])
		expect(totalsPerPage(result)).toEqual([3, 3])
	})
})

describe("addOptimisticMemoryToQueryData", () => {
	const memory: OptimisticMemory = {
		id: "new",
		content: "hi",
		url: null,
		title: "t",
		description: "",
		containerTags: [],
		createdAt: "",
		updatedAt: "",
		status: "queued",
		type: "note",
		metadata: {},
		memoryEntries: [],
		isOptimistic: true,
	}

	it("prepends to the first page and bumps the grand total", () => {
		const data = pagesData([page(["a"], 1), page(["b"], 1)])

		const result = addOptimisticMemoryToQueryData(data, memory)

		expect(idsPerPage(result)).toEqual([["new", "a"], ["b"]])
		expect(totalsPerPage(result)[0]).toBe(2)
	})
})
