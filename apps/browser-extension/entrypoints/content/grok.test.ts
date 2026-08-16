import { describe, expect, it } from "bun:test"
import { removeGrokMemoryUiElements, sanitizeGrokMemoryText } from "./grok"

describe("sanitizeGrokMemoryText", () => {
	it("removes Grok interface text when it occupies a full line", () => {
		const text = [
			"Memory from your chats",
			"This summary is regenerated periodically from your conversations.",
			"Save to supermemory",
			"Close",
			"Delete memory",
			"  Edit  ",
			"The user prefers TypeScript.",
		].join("\r\n")

		expect(sanitizeGrokMemoryText(text)).toBe("The user prefers TypeScript.")
	})

	it("preserves interface words when they are part of user memories", () => {
		const text = [
			"Editor: VS Code",
			"I use the Edit command every day.",
			"Close friends know I prefer tea.",
			"Delete memory leaks before deploying.",
			"Memory from your chats can be useful.",
		].join("\n")

		expect(sanitizeGrokMemoryText(text)).toBe(text)
	})

	it("trims lines and removes empty whitespace", () => {
		expect(
			sanitizeGrokMemoryText("\n  First memory  \n\t\n Second memory \n"),
		).toBe("First memory\nSecond memory")
	})

	it("removes UI elements without deleting formatted memory text", () => {
		const memory = createTextElement("Editor: VS Code")
		const heading = createTextElement("Memory from your chats")
		const description = createTextElement(
			"This summary is regenerated periodically from your conversations.",
		)
		const editButton = createTextElement("Edit")
		const deleteButton = createTextElement("Delete memory")
		const inlineEdit = createTextElement("Edit")
		const elements = [
			memory,
			heading,
			description,
			editButton,
			deleteButton,
			inlineEdit,
		]

		removeGrokMemoryUiElements({
			querySelectorAll: (selector) => {
				if (selector.includes("div")) return [heading, description]
				if (selector.startsWith("button")) return [editButton, deleteButton]
				return []
			},
		})

		const collapsedText = elements
			.filter((element) => !element.removed)
			.map((element) => element.textContent)
			.join("")
		expect(collapsedText).toBe("Editor: VS CodeEdit")
		expect(memory.removed).toBe(false)
		expect(inlineEdit.removed).toBe(false)
	})
})

function createTextElement(textContent: string) {
	return {
		textContent,
		removed: false,
		remove() {
			this.removed = true
		},
	}
}
