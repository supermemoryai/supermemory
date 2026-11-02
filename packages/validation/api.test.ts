import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import {
	BulkDeleteMemoriesSchema,
	ContainerTagProfileResponseSchema,
	DocumentsWithMemoriesQuerySchema,
	ListMemoriesQuerySchema,
	SearchRequestSchema,
	Searchv4RequestSchema,
} from "./api"

describe("search threshold schemas", () => {
	it("do not contain redundant number transforms or unreachable range guards", () => {
		const source = readFileSync(new URL("./api.ts", import.meta.url), "utf8")
		const searchSchemas = source.slice(
			source.indexOf("export const SearchRequestSchema"),
			source.indexOf("export const SearchResultSchema"),
		)

		expect(searchSchemas).not.toContain(".transform(Number)")
		expect(searchSchemas).not.toContain("v === undefined || (v >= 0 && v <= 1)")
	})

	it("preserves threshold defaults", () => {
		const search = SearchRequestSchema.parse({ q: "memory" })
		const searchV4 = Searchv4RequestSchema.parse({ q: "memory" })

		expect(search.chunkThreshold).toBe(0)
		expect(search.documentThreshold).toBe(0)
		expect(searchV4.threshold).toBe(0.6)
	})

	it.each([0, 0.5, 1])("accepts inclusive threshold value %p", (threshold) => {
		expect(
			SearchRequestSchema.parse({
				q: "memory",
				chunkThreshold: threshold,
				documentThreshold: threshold,
			}),
		).toMatchObject({
			chunkThreshold: threshold,
			documentThreshold: threshold,
		})
		expect(
			Searchv4RequestSchema.parse({ q: "memory", threshold }).threshold,
		).toBe(threshold)
	})

	it.each([
		-0.1, 1.1,
	])("rejects out-of-range threshold value %p", (threshold) => {
		expect(
			SearchRequestSchema.safeParse({
				q: "memory",
				chunkThreshold: threshold,
			}).success,
		).toBe(false)
		expect(
			SearchRequestSchema.safeParse({
				q: "memory",
				documentThreshold: threshold,
			}).success,
		).toBe(false)
		expect(
			Searchv4RequestSchema.safeParse({ q: "memory", threshold }).success,
		).toBe(false)
	})

	it("does not coerce threshold strings", () => {
		expect(
			SearchRequestSchema.safeParse({
				q: "memory",
				chunkThreshold: "0.5",
			}).success,
		).toBe(false)
		expect(
			SearchRequestSchema.safeParse({
				q: "memory",
				documentThreshold: "0.5",
			}).success,
		).toBe(false)
		expect(
			Searchv4RequestSchema.safeParse({
				q: "memory",
				threshold: "0.5",
			}).success,
		).toBe(false)
	})
})

describe("pagination query schemas", () => {
	it("preserve page/limit defaults", () => {
		const listed = ListMemoriesQuerySchema.parse({})
		expect(listed.page).toBe(1)
		expect(listed.limit).toBe(10)

		const docs = DocumentsWithMemoriesQuerySchema.parse({})
		expect(docs.page).toBe(1)
		expect(docs.limit).toBe(10)
	})

	it.each([
		1, 50, 1100,
	])("ListMemoriesQuerySchema accepts numeric limit %p", (limit) => {
		expect(ListMemoriesQuerySchema.parse({ limit }).limit).toBe(limit)
	})

	it("ListMemoriesQuerySchema accepts numeric string page/limit", () => {
		const parsed = ListMemoriesQuerySchema.parse({ page: "3", limit: "25" })
		expect(parsed.page).toBe(3)
		expect(parsed.limit).toBe(25)
	})

	it.each([
		0, -5, 2.5,
	])("ListMemoriesQuerySchema rejects non-positive or fractional numeric limit %p", (limit) => {
		expect(ListMemoriesQuerySchema.safeParse({ limit }).success).toBe(false)
	})

	it.each([
		0, -1, 1.5,
	])("ListMemoriesQuerySchema rejects non-positive or fractional numeric page %p", (page) => {
		expect(ListMemoriesQuerySchema.safeParse({ page }).success).toBe(false)
	})

	it("ListMemoriesQuerySchema still caps limit at 1100", () => {
		expect(ListMemoriesQuerySchema.safeParse({ limit: 1101 }).success).toBe(
			false,
		)
	})

	it.each([
		0, -1, 2.5,
	])("DocumentsWithMemoriesQuerySchema rejects invalid page %p", (page) => {
		expect(DocumentsWithMemoriesQuerySchema.safeParse({ page }).success).toBe(
			false,
		)
	})

	it.each([
		0, -10, 2.5,
	])("DocumentsWithMemoriesQuerySchema rejects invalid limit %p", (limit) => {
		expect(DocumentsWithMemoriesQuerySchema.safeParse({ limit }).success).toBe(
			false,
		)
	})

	it("DocumentsWithMemoriesQuerySchema accepts a normal request", () => {
		const parsed = DocumentsWithMemoriesQuerySchema.parse({
			page: 2,
			limit: 50,
		})
		expect(parsed.page).toBe(2)
		expect(parsed.limit).toBe(50)
	})

	it("DocumentsWithMemoriesQuerySchema caps limit at 1000", () => {
		expect(
			DocumentsWithMemoriesQuerySchema.safeParse({ limit: 1001 }).success,
		).toBe(false)
		expect(
			DocumentsWithMemoriesQuerySchema.safeParse({ limit: 200 }).success,
		).toBe(true)
	})

	it("BulkDeleteMemoriesSchema caps containerTags at 100 entries of bounded length", () => {
		const tooMany = {
			containerTags: Array.from({ length: 101 }, (_, i) => `tag_${i}`),
		}
		expect(BulkDeleteMemoriesSchema.safeParse(tooMany).success).toBe(false)

		const tagTooLong = { containerTags: ["x".repeat(257)] }
		expect(BulkDeleteMemoriesSchema.safeParse(tagTooLong).success).toBe(false)

		const ok = { containerTags: ["tag_a", "tag_b"] }
		expect(BulkDeleteMemoriesSchema.safeParse(ok).success).toBe(true)
	})
})

describe("ContainerTagProfileResponseSchema", () => {
	// One entry as GET /v3/container-tags/:containerTag/profile returns it.
	const entry = {
		id: "KyYkFfHPine8Mkvmgc6yzh",
		memory: "Ivan Petrov is a principal database architect at Volta Grid.",
		isStatic: true,
		isInference: false,
		version: 1,
		sourceCount: 1,
		rootMemoryId: "KyYkFfHPine8Mkvmgc6yzh",
		parentMemoryId: null,
		createdAt: "2026-10-27T06:52:34.160Z",
		updatedAt: "2026-10-27T06:52:34.160Z",
		metadata: {
			temporalContext: { documentDate: "2026-10-27", eventDate: null },
		},
	}

	it("parses the memory objects the API returns", () => {
		const parsed = ContainerTagProfileResponseSchema.parse({
			profile: {
				static: [entry],
				dynamic: [{ ...entry, id: "dyn_1", isStatic: false }],
			},
		})

		expect(parsed.profile.static?.[0]?.memory).toBe(entry.memory)
		expect(parsed.profile.static?.[0]?.createdAt).toBeInstanceOf(Date)
		expect(parsed.profile.dynamic?.[0]).toMatchObject({
			id: "dyn_1",
			isStatic: false,
			parentMemoryId: null,
		})
	})

	it("accepts an empty profile", () => {
		const parsed = ContainerTagProfileResponseSchema.parse({
			profile: { static: [], dynamic: [] },
		})

		expect(parsed.profile.static).toEqual([])
		expect(parsed.profile.dynamic).toEqual([])
	})
})
