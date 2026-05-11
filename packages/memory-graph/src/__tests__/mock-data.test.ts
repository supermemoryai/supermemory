import { describe, it, expect } from "vitest"
import { generateMockGraphData } from "../mock-data"

describe("generateMockGraphData", () => {
	it("produces deterministic output with same seed", () => {
		const data1 = generateMockGraphData({ documentCount: 10, seed: 42 })
		const data2 = generateMockGraphData({ documentCount: 10, seed: 42 })

		expect(data1.documents.length).toBe(data2.documents.length)
		expect(data1.documents[0]?.id).toBe(data2.documents[0]?.id)
		expect(data1.documents[0]?.title).toBe(data2.documents[0]?.title)
	})

	it("produces different output with different seeds", () => {
		const data1 = generateMockGraphData({ documentCount: 10, seed: 42 })
		const data2 = generateMockGraphData({ documentCount: 10, seed: 99 })

		// At least some documents should differ
		const titles1 = data1.documents.map((d) => d.title).join(",")
		const titles2 = data2.documents.map((d) => d.title).join(",")
		expect(titles1).not.toBe(titles2)
	})

	it("generates correct number of documents", () => {
		const data = generateMockGraphData({ documentCount: 25, seed: 1 })
		expect(data.documents.length).toBe(25)
	})

	it("documents have required fields", () => {
		const data = generateMockGraphData({ documentCount: 5, seed: 1 })
		for (const doc of data.documents) {
			expect(doc.id).toBeDefined()
			expect(doc.title).toBeDefined()
			expect(doc.summary).toBeDefined()
			expect(doc.documentType).toBeDefined()
			expect(doc.createdAt).toBeDefined()
			expect(doc.updatedAt).toBeDefined()
			expect(Array.isArray(doc.memories)).toBe(true)
		}
	})

	it("memories have required fields", () => {
		const data = generateMockGraphData({ documentCount: 5, seed: 1 })
		const doc = data.documents.find((d) => d.memories.length > 0)
		expect(doc).toBeDefined()
		if (!doc) return

		for (const mem of doc.memories) {
			expect(mem.id).toBeDefined()
			expect(mem.memory).toBeDefined()
			expect(typeof mem.isStatic).toBe("boolean")
			expect(typeof mem.isForgotten).toBe("boolean")
			expect(typeof mem.isLatest).toBe("boolean")
			expect(typeof mem.version).toBe("number")
			expect(mem.createdAt).toBeDefined()
			expect(mem.updatedAt).toBeDefined()
		}
	})

	it("handles zero documents", () => {
		const data = generateMockGraphData({ documentCount: 0, seed: 1 })
		expect(data.documents.length).toBe(0)
	})

	it("respects memoriesPerDoc range", () => {
		const data = generateMockGraphData({
			documentCount: 50,
			memoriesPerDoc: [3, 3],
			seed: 1,
		})
		for (const doc of data.documents) {
			expect(doc.memories.length).toBe(3)
		}
	})

	it("generates version chains for some documents", () => {
		const data = generateMockGraphData({
			documentCount: 50,
			memoriesPerDoc: [3, 6],
			seed: 42,
		})
		// With 50 docs and 30% chain probability, we should have some chains
		const hasChain = data.documents.some((doc) =>
			doc.memories.some((mem) => mem.parentMemoryId !== null),
		)
		expect(hasChain).toBe(true)
	})
})
