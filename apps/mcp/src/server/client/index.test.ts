import { describe, expect, it, vi } from "vitest"
import { SupermemoryClient } from "./index"

describe("SupermemoryClient.createMemory", () => {
	it("passes sm_source by default when no metadata is provided", async () => {
		const client = new SupermemoryClient("test-token", "test-ns")
		const addMock = vi.fn().mockResolvedValue({
			id: "doc-123",
			status: "queued",
		})
		;(client as unknown as { client: { add: typeof addMock } }).client = {
			add: addMock,
		}

		const result = await client.createMemory("hello world")

		expect(addMock).toHaveBeenCalledWith("test-ns", {
			content: "hello world",
			metadata: { sm_source: "supermemory-mcp" },
		})
		expect(result).toEqual({
			id: "doc-123",
			status: "queued",
			namespace: "test-ns",
		})
	})

	it("merges custom metadata with sm_source", async () => {
		const client = new SupermemoryClient("test-token", "test-ns")
		const addMock = vi.fn().mockResolvedValue({
			id: "doc-456",
			status: "queued",
		})
		;(client as unknown as { client: { add: typeof addMock } }).client = {
			add: addMock,
		}

		const result = await client.createMemory("project fact", {
			client: "claude",
			project: "supermemory-mcp",
		})

		expect(addMock).toHaveBeenCalledWith("test-ns", {
			content: "project fact",
			metadata: {
				sm_source: "supermemory-mcp",
				client: "claude",
				project: "supermemory-mcp",
			},
		})
		expect(result).toEqual({
			id: "doc-456",
			status: "queued",
			namespace: "test-ns",
		})
	})
})
