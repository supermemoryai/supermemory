import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
	manualMemoryDocument,
	manualMemoryId,
	type MemoryMessage,
} from "./manual-memory"

const messages: MemoryMessage[] = [
	{ role: "user", content: "I prefer oat milk" },
	{ role: "assistant", content: "I'll remember that." },
]

describe("manual chat memories", () => {
	it("updates the same conversation document when more messages arrive", () => {
		const selection = { kind: "chat" } as const
		const first = manualMemoryDocument(
			"alice",
			"session-1",
			messages,
			selection,
		)
		const updated = manualMemoryDocument(
			"alice",
			"session-1",
			[...messages, { role: "user", content: "I also like tea" }],
			selection,
		)
		assert.equal(updated.id, first.id)
		assert.equal(first.id, "session-1")
		assert.match(first.content, /Source: SDK playground conversation session-1/)
		assert.match(updated.content, /I also like tea/)
		assert.doesNotMatch(first.content, /I also like tea/)
		assert.equal(updated.metadata.source, "sdk-playground")
		assert.equal(updated.metadata.conversationId, "session-1")
		assert.equal(updated.metadata.selection, "chat")
	})

	it("identifies a selected message for save and removal", () => {
		const selection = { kind: "message", index: 1 } as const
		const document = manualMemoryDocument(
			"alice",
			"session-1",
			messages,
			selection,
		)
		assert.equal(document.id, manualMemoryId("alice", "session-1", selection))
		assert.match(document.content, /message 2/)
		assert.match(document.content, /Assistant: I'll remember that\./)
		assert.doesNotMatch(document.content, /I prefer oat milk/)
		assert.equal(document.metadata.messageIndex, 1)
		assert.notEqual(
			document.id,
			manualMemoryId("alice", "session-1", { kind: "chat" }),
		)
	})

	it("scopes selected-message IDs by namespace and conversation", () => {
		const selection = { kind: "message", index: 0 } as const
		assert.notEqual(
			manualMemoryId("alice", "session-1", selection),
			manualMemoryId("bob", "session-1", selection),
		)
		assert.notEqual(
			manualMemoryId("alice", "session-1", selection),
			manualMemoryId("alice", "session-2", selection),
		)
	})

	it("rejects a missing or blank selected message", () => {
		assert.throws(
			() =>
				manualMemoryDocument("alice", "session-1", messages, {
					kind: "message",
					index: 9,
				}),
			/no text/,
		)
		assert.throws(
			() =>
				manualMemoryDocument(
					"alice",
					"session-1",
					[{ role: "user", content: " " }],
					{ kind: "chat" },
				),
			/no text/,
		)
	})
})
