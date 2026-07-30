import { describe, expect, it } from "bun:test"
import { readFileSync } from "node:fs"
import { createSchema } from "zod-openapi"
import {
	ListMemoriesQuerySchema,
	MemorySchema,
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

describe("Zod v4 schema compatibility", () => {
	it("preserves transformed pagination defaults", () => {
		expect(ListMemoriesQuerySchema.parse({})).toMatchObject({
			limit: 10,
			page: 1,
			order: "desc",
			sort: "createdAt",
		})
	})

	it("materializes every nested search include default", () => {
		expect(Searchv4RequestSchema.parse({ q: "memory" }).include).toEqual({
			documents: false,
			summaries: false,
			relatedMemories: false,
		})
	})

	it("retains OpenAPI metadata through native Zod metadata", () => {
		const { schema } = createSchema(MemorySchema)
		expect(schema).toMatchObject({
			description: "Memory object",
			properties: {
				id: {
					description: "Unique identifier of the memory.",
					example: "acxV5LHMEsG2hMSNb4umbn",
				},
			},
		})
	})
})
