import { describe, expect, it } from "bun:test"
import { parsePluginDocument } from "./plugin-document"

type PluginDocumentInput = Parameters<typeof parsePluginDocument>[0]

function makeCodexSessionDocument(content: string): PluginDocumentInput {
	return {
		id: "doc_1",
		title: "Codex session",
		content,
		metadata: { sm_source: "codex" },
		memoryEntries: [],
	} as unknown as PluginDocumentInput
}

describe("parsePluginDocument — session transcripts", () => {
	it("keeps multi-line message bodies intact", () => {
		const parsed = parsePluginDocument(
			makeCodexSessionDocument(
				[
					"[Session abc-123]",
					"1. [user] Hello there",
					"Here is more context on line two",
					"2. [assistant] Sure!",
					"Second line of the reply",
				].join("\n"),
			),
		)

		expect(parsed).not.toBeNull()
		expect(parsed?.kind).toBe("codex-session")
		expect(parsed?.messages).toHaveLength(2)
		expect(parsed?.messages[0]?.text).toBe(
			"Hello there\nHere is more context on line two",
		)
		expect(parsed?.messages[1]?.text).toBe("Sure!\nSecond line of the reply")
	})

	it("surfaces memory id artifacts from continuation lines", () => {
		const parsed = parsePluginDocument(
			makeCodexSessionDocument(
				[
					"[Session abc-123]",
					"1. [user] Remember my editor is Neovim",
					"memory id: mem_456",
					"2. [assistant] Saved it.",
				].join("\n"),
			),
		)

		expect(parsed?.messages[0]?.text).toBe("Remember my editor is Neovim")
		expect(parsed?.artifacts).toContainEqual({
			label: "Memory ID",
			value: "mem_456",
		})
	})

	it("normalizes literal \\n escapes before splitting messages", () => {
		const parsed = parsePluginDocument(
			makeCodexSessionDocument(
				"[Session abc-123]\\n1. [user] First line\\nSecond line\\n2. [assistant] Reply",
			),
		)

		expect(parsed?.messages).toHaveLength(2)
		expect(parsed?.messages[0]?.text).toBe("First line\nSecond line")
		expect(parsed?.messages[1]?.text).toBe("Reply")
	})

	it("parses single-line messages as before", () => {
		const parsed = parsePluginDocument(
			makeCodexSessionDocument(
				["[Session abc-123]", "1. [user] Hi", "2. [assistant] Hello!"].join(
					"\n",
				),
			),
		)

		expect(parsed?.messages).toHaveLength(2)
		expect(parsed?.messages[0]?.text).toBe("Hi")
		expect(parsed?.messages[1]?.text).toBe("Hello!")
		expect(parsed?.summary).toBe(
			"1 user message and 1 assistant message captured from Codex.",
		)
	})
})
