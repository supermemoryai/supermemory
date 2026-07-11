import { describe, expect, it } from "bun:test"
import { parsePluginDocument } from "./plugin-document"

describe("plugin document parsing", () => {
	it("keeps multi-line transcript messages and extracts artifacts", () => {
		const parsed = parsePluginDocument({
			id: "doc-1",
			title: "Session",
			content: [
				"[Session session_123]",
				"1. [user] Hello there",
				"Here is more context on line two",
				"memory id: mem_123",
				"2. [assistant] Sure!",
				"Second line of the reply",
			].join("\n"),
			source: "codex",
			metadata: {},
			memoryEntries: [],
		} as never)

		expect(parsed?.messages).toEqual([
			{
				id: "1-user",
				role: "user",
				text: "Hello there\nHere is more context on line two",
			},
			{
				id: "2-assistant",
				role: "assistant",
				text: "Sure!\nSecond line of the reply",
			},
		])
		expect(parsed?.artifacts).toContainEqual({
			label: "Memory ID",
			value: "mem_123",
		})
	})
})
