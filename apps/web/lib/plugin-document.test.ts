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
	it("renders plain OpenCode documents in structured and raw views", () => {
		const content = "Vedant Mahajan works at Supermemory."
		const parsed = parsePluginDocument({
			id: "doc_opencode",
			title: content,
			content,
			source: "opencode",
			metadata: {
				sm_source: "opencode",
				sm_scope: "project",
			},
			containerTags: ["repo_supermemory"],
			memoryEntries: [],
		} as unknown as PluginDocumentInput)

		expect(parsed?.pluginLabel).toBe("OpenCode")
		expect(parsed?.sections).toEqual([
			{ label: "Memory", value: content, tone: "default" },
		])
		expect(parsed?.rawContent).toBe(content)
	})

	it("renders OpenCode transcripts as structured conversations", () => {
		const content = [
			"[Conversation ses_abc:1-2]",
			"1. [user] Test the renderer",
			"2. [assistant] First line of the response",
			"Second line of the response",
		].join("\n")
		const parsed = parsePluginDocument({
			id: "doc_opencode_conversation",
			title: "[Conversation ses_abc:1-2]",
			content,
			source: "opencode",
			metadata: {
				sm_source: "opencode",
				type: "conversation",
				conversationId: "ses_abc:1-2",
			},
			containerTags: ["repo_supermemory"],
			memoryEntries: [],
		} as unknown as PluginDocumentInput)

		expect(parsed?.kind).toBe("plugin-session")
		expect(parsed?.title).toBe("OpenCode conversation")
		expect(parsed?.summary).toBe(
			"1 user message and 1 assistant message captured from OpenCode.",
		)
		expect(parsed?.identifierLabel).toBe("Conversation")
		expect(parsed?.identifierValue).toBe("ses_abc:1-2")
		expect(parsed?.messages).toEqual([
			{ id: "1-user", role: "user", text: "Test the renderer" },
			{
				id: "2-assistant",
				role: "assistant",
				text: "First line of the response\nSecond line of the response",
			},
		])
		expect(parsed?.sections).toEqual([])
		expect(parsed?.rawContent).toBe(content)
	})

	it("renders Claude Code transcripts as conversations before embedded saves", () => {
		const content = [
			"<|turn_start|>2026-07-13T15:12:54.912Z",
			"<|start|>user<|message|>Remember that this project uses Vitest.<|end|>",
			"<|start|>assistant<|message|>I'll save that preference.<|end|>",
			"<|start|>assistant:tool_result<|message|>[SAVE:vedant:2026-07-13]",
			"Decision: Use Vitest for JavaScript tests.",
			"[/SAVE]<|end|>",
			"<|turn_end|>",
		].join("\n")
		const parsed = parsePluginDocument({
			id: "doc_claude_conversation",
			title: "Project Preference",
			content,
			source: "claude-code",
			metadata: {
				sm_source: "claude-code",
				type: "session_turn",
				project: "supermemory",
			},
			containerTags: ["repo_supermemory"],
			memoryEntries: [],
		} as unknown as PluginDocumentInput)

		expect(parsed?.kind).toBe("claude-code-doc")
		expect(parsed?.formatLabel).toBe("Conversation")
		expect(parsed?.title).toBe("Claude Code conversation")
		expect(parsed?.summary).toBe(
			"1 user message and 1 assistant message captured from Claude Code.",
		)
		expect(parsed?.messages).toEqual([
			{
				id: "user-0",
				role: "user",
				text: "Remember that this project uses Vitest.",
			},
			{
				id: "assistant-1",
				role: "assistant",
				text: "I'll save that preference.",
			},
			{
				id: "tool-2",
				role: "tool",
				text: [
					"[SAVE:vedant:2026-07-13]",
					"Decision: Use Vitest for JavaScript tests.",
					"[/SAVE]",
				].join("\n"),
			},
		])
		expect(parsed?.sections).toEqual([])
		expect(parsed?.rawContent).toBe(content)
	})

	it("keeps the Codex source badge inside a shared Agents container", () => {
		const parsed = parsePluginDocument({
			...makeCodexSessionDocument(
				["[Session abc-123]", "1. [user] Shared memory"].join("\n"),
			),
			source: "codex",
			containerTags: ["user_project_0123456789abcdef"],
		} as unknown as PluginDocumentInput)

		expect(parsed?.pluginLabel).toBe("Codex")
		expect(parsed?.pluginIconSrc).toBe("/images/plugins/codex.png")
	})

	it("keeps the Claude Code source badge inside a shared Agents container", () => {
		const parsed = parsePluginDocument({
			id: "doc_claude",
			title: "Claude memory",
			content: "Remember this project convention",
			source: "claude-code",
			metadata: {
				sm_source: "claude-code",
				type: "manual",
				project: "supermemory",
			},
			containerTags: ["repo_supermemory"],
			memoryEntries: [],
		} as unknown as PluginDocumentInput)

		expect(parsed?.pluginLabel).toBe("Claude Code")
		expect(parsed?.pluginIconSrc).toBe("/images/plugins/claude-code.svg")
	})

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
